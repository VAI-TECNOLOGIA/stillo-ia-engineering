import { z } from 'zod';

/**
 * SISTEMA DE EVIDÊNCIAS — nenhum dado existe sem origem.
 *
 * Todo valor extraído de um documento carrega:
 *  - fonte: de onde veio ("PLANTA BAIXA - LAZER", "CORTE AA", "CARIMBO", "MEMORIAL p.3")
 *  - pagina: página do documento
 *  - status: CONFIRMADO (com evidência) | NAO_IDENTIFICADO (sem evidência → valor null)
 *
 * Regra global anti-inferência: valor sem fonte é INVÁLIDO no parse.
 * A IA é instruída a devolver { valor: null, status: "NAO_IDENTIFICADO" }
 * quando não houver evidência textual explícita.
 */

export const EvidenciaStatusEnum = z.enum(['CONFIRMADO', 'NAO_IDENTIFICADO']);
export type EvidenciaStatus = z.infer<typeof EvidenciaStatusEnum>;

/** Garante coerência: CONFIRMADO exige valor+fonte; NAO_IDENTIFICADO exige valor null. */
function coerencia(campo: { valor: unknown; fonte: string | null; status: EvidenciaStatus }, ctx: z.RefinementCtx) {
  if (campo.status === 'CONFIRMADO') {
    if (campo.valor === null || campo.valor === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CONFIRMADO exige valor não-nulo.' });
    }
    if (!campo.fonte || campo.fonte.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CONFIRMADO exige fonte (evidência obrigatória).' });
    }
  } else if (campo.valor !== null && campo.valor !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NAO_IDENTIFICADO exige valor null (proibido inferir).' });
  }
}

const base = {
  fonte: z.string().nullable().default(null),
  pagina: z.number().int().positive().nullable().default(null),
  status: EvidenciaStatusEnum.default('NAO_IDENTIFICADO'),
};

/** Número com evidência (medidas, potências, vazões, quantidades). */
export const EvidNumero = z
  .object({ valor: z.number().nullable().default(null), unidade: z.string().nullable().optional(), ...base })
  .superRefine(coerencia);

/** Texto com evidência (descrições, modelos, especificações). */
export const EvidTexto = z
  .object({ valor: z.string().nullable().default(null), ...base })
  .superRefine(coerencia);

/** Booleano com evidência (existe sauna? existe deck?). null = não identificado. */
export const EvidBool = z
  .object({ valor: z.boolean().nullable().default(null), ...base })
  .superRefine(coerencia);

export type EvidenciaNumero = z.infer<typeof EvidNumero>;
export type EvidenciaTexto = z.infer<typeof EvidTexto>;
export type EvidenciaBool = z.infer<typeof EvidBool>;

/** Evidência vazia padrão — usada como fallback seguro. */
export const NAO_IDENTIFICADO = { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' as const };

/**
 * Campo consolidado: valor final + TODAS as fontes que o sustentam.
 * Status CONFLITO quando duas disciplinas divergem — nunca sobrescrever.
 */
export interface CampoConsolidado<T = number | string | boolean> {
  valor: T | null;
  fontes: { documento: string; documentType: string; fonte: string; pagina: number | null; valor: T }[];
  status: 'CONFIRMADO' | 'NAO_IDENTIFICADO' | 'CONFLITO';
}

export function campoVazio<T>(): CampoConsolidado<T> {
  return { valor: null, fontes: [], status: 'NAO_IDENTIFICADO' };
}

/** Parse robusto da resposta IA: aceita JSON puro ou cercado por ```json. */
export function limparJson(raw: string): unknown {
  const limpo = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(limpo);
}
