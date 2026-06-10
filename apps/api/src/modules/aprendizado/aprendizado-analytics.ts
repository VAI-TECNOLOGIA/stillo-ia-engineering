/**
 * Analytics de aprendizado (domínio puro). Consolida correções humanas em
 * estatísticas e detecta padrões recorrentes que viram sugestões para o admin.
 */
export interface CorrecaoLike {
  entidade: string;
  de: unknown;
  para: unknown;
  justificativa?: string | null;
  createdAt: Date | string;
}

export interface Estatisticas {
  total: number;
  comJustificativa: number;
  produtosTrocados: number;
  porEntidade: { entidade: string; total: number }[];
  porDia: { dia: string; total: number }[];
}

export interface Padrao {
  tipo: 'TROCA_PRODUTO' | 'REMOCAO';
  chave: string;
  descricao: string;
  ocorrencias: number;
  exemplo?: string;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function dia(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function agregarEstatisticas(correcoes: CorrecaoLike[]): Estatisticas {
  const porEntidadeMap = new Map<string, number>();
  const porDiaMap = new Map<string, number>();
  let comJustificativa = 0;
  let produtosTrocados = 0;

  for (const c of correcoes) {
    porEntidadeMap.set(c.entidade, (porEntidadeMap.get(c.entidade) ?? 0) + 1);
    const d = dia(c.createdAt);
    porDiaMap.set(d, (porDiaMap.get(d) ?? 0) + 1);
    if (c.justificativa && String(c.justificativa).trim()) comJustificativa++;

    const de = obj(c.de);
    const para = obj(c.para);
    if (de.produtoId && para.produtoId && de.produtoId !== para.produtoId) produtosTrocados++;
  }

  return {
    total: correcoes.length,
    comJustificativa,
    produtosTrocados,
    porEntidade: [...porEntidadeMap.entries()].map(([entidade, total]) => ({ entidade, total })).sort((a, b) => b.total - a.total),
    porDia: [...porDiaMap.entries()].map(([dia, total]) => ({ dia, total })).sort((a, b) => a.dia.localeCompare(b.dia)),
  };
}

export function detectarPadroes(correcoes: CorrecaoLike[], minOcorrencias = 2): Padrao[] {
  const trocas = new Map<string, { count: number; exemplo: string }>();
  const remocoes = new Map<string, { count: number; exemplo: string }>();

  for (const c of correcoes) {
    const de = obj(c.de);
    const para = obj(c.para);

    if (de.produtoId && para.produtoId && de.produtoId !== para.produtoId) {
      const chave = `${String(de.produtoId)}->${String(para.produtoId)}`;
      const ex = `“${String(de.descricao ?? '')}”: ${String(de.produtoId)} → ${String(para.produtoId)}`;
      const cur = trocas.get(chave) ?? { count: 0, exemplo: ex };
      trocas.set(chave, { count: cur.count + 1, exemplo: cur.exemplo });
    }

    const paraVazio = Object.keys(para).length === 0;
    if (paraVazio && de.descricao) {
      const chave = String(de.descricao);
      const cur = remocoes.get(chave) ?? { count: 0, exemplo: chave };
      remocoes.set(chave, { count: cur.count + 1, exemplo: cur.exemplo });
    }
  }

  const padroes: Padrao[] = [];
  for (const [chave, v] of trocas) {
    if (v.count >= minOcorrencias) padroes.push({ tipo: 'TROCA_PRODUTO', chave, descricao: `Troca de produto recorrente (${v.count}x). Considere revisar a regra/catálogo.`, ocorrencias: v.count, exemplo: v.exemplo });
  }
  for (const [chave, v] of remocoes) {
    if (v.count >= minOcorrencias) padroes.push({ tipo: 'REMOCAO', chave, descricao: `Item “${chave}” removido com frequência (${v.count}x). Talvez a regra não devesse gerá-lo.`, ocorrencias: v.count, exemplo: v.exemplo });
  }
  return padroes.sort((a, b) => b.ocorrencias - a.ocorrencias);
}
