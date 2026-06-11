import { normalizarAreaM2, normalizarComprimentoM, parseNumeroBR } from './numeric.util';

/**
 * Achata os campos numéricos CRÍTICOS de uma extração de disciplina num mapa
 * plano `"TIPO.campo" → número normalizado`, para o consenso entre IAs.
 * Alinha corpos d'água pelo tipoCorpo (PISCINA_ADULTO, PISCINA_INFANTIL…) —
 * as IAs concordam no tipo mais facilmente que no nome livre.
 * Só entra valor com evidência CONFIRMADO (o resto já é pendência por si só).
 */
export function achatarCamposCriticos(extracao: unknown): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  if (!extracao || typeof extracao !== 'object') return out;
  const ex = extracao as Record<string, unknown>;

  const evidNum = (campo: unknown): { valor: unknown; status?: string } | null =>
    campo && typeof campo === 'object' ? (campo as { valor: unknown; status?: string }) : null;

  const corpos = Array.isArray(ex.corposDagua) ? (ex.corposDagua as Record<string, unknown>[]) : [];
  for (const c of corpos) {
    const tipo = typeof c.tipoCorpo === 'string' && c.tipoCorpo !== 'DESCONHECIDO'
      ? c.tipoCorpo
      : (typeof c.nome === 'string' ? c.nome.toUpperCase() : 'CORPO');

    const por = (campo: string, e: { valor: unknown; status?: string } | null, norm: (v: unknown) => number | null) => {
      if (e && e.status === 'CONFIRMADO' && e.valor != null) out[`${tipo}.${campo}`] = norm(e.valor);
    };
    por('areaM2', evidNum(c.areaM2), (v) => normalizarAreaM2(v));
    por('larguraM', evidNum(c.larguraM), (v) => normalizarComprimentoM(v));
    por('comprimentoM', evidNum(c.comprimentoM), (v) => normalizarComprimentoM(v));
    por('volumeM3', evidNum(c.volumeM3), (v) => parseNumeroBR(v));
    por('profundidadeM', evidNum(c.profundidadeM), (v) => normalizarComprimentoM(v));
  }

  // Cortes: profundidades[] com referência → alinha pelo tipo inferido da referência
  const profs = Array.isArray(ex.profundidades) ? (ex.profundidades as Record<string, unknown>[]) : [];
  for (const p of profs) {
    const ref = typeof p.referencia === 'string' ? p.referencia.toLowerCase() : '';
    const tipo = /infantil/.test(ref) ? 'PISCINA_INFANTIL' : /adulto|piscina/.test(ref) ? 'PISCINA_ADULTO'
      : /spa/.test(ref) ? 'SPA' : (p.referencia as string ?? 'CORTE');
    const max = p.profundidadeMaxM as { valor: unknown; status?: string } | undefined;
    if (max && max.status === 'CONFIRMADO' && max.valor != null) {
      out[`${tipo}.profundidadeM`] = normalizarComprimentoM(max.valor);
    }
  }

  return out;
}

/** Rótulo amigável p/ a notificação ao usuário a partir da chave "TIPO.campo". */
export function rotuloCampo(chave: string): string {
  const [tipo, campo] = chave.split('.');
  const nomeTipo: Record<string, string> = {
    PISCINA_ADULTO: 'a piscina adulto', PISCINA_INFANTIL: 'a piscina infantil',
    SPA: 'o spa', PRAINHA: 'a prainha', ESPELHO_DAGUA: "o espelho d'água",
  };
  const nomeCampo: Record<string, string> = {
    areaM2: 'a área', larguraM: 'a largura', comprimentoM: 'o comprimento',
    volumeM3: 'o volume', profundidadeM: 'a profundidade',
  };
  const t = nomeTipo[tipo] ?? `"${tipo}"`;
  const c = nomeCampo[campo] ?? campo;
  // contrai a preposição: "de a" → "da", "de o" → "do"
  return `${c} de ${t}`.replace(/\bde a /g, 'da ').replace(/\bde o /g, 'do ');
}
