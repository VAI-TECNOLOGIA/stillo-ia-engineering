/**
 * Montagem do orçamento a partir dos itens do dimensionamento (domínio puro).
 * Mapeia necessidade técnica → linha de orçamento, herdando o SKU sugerido e o
 * preço do produto, e calculando subtotais e total.
 */
export interface DimItemEntrada {
  piscinaId?: string | null;
  descricao: string;
  quantidade: number;
  unidade?: string;
  regraId?: string | null;
  produtoSugeridoId?: string | null;
  produtoSugerido?: { id: string; preco: number | string } | null;
}

export type ItemOrigem = 'REGRA' | 'IA_RAG' | 'MANUAL';

export interface ItemOrcamentoData {
  piscinaId: string | null;
  produtoId: string | null;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  subtotal: number;
  origem: ItemOrigem;
  regraId: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function montarItensOrcamento(dimItens: DimItemEntrada[]): { itens: ItemOrcamentoData[]; valorTotal: number } {
  const itens = dimItens.map((di): ItemOrcamentoData => {
    const precoUnit = Number(di.produtoSugerido?.preco ?? 0);
    const quantidade = di.quantidade;
    const subtotal = round2(quantidade * precoUnit);
    const origem: ItemOrigem = di.regraId ? 'REGRA' : di.produtoSugeridoId ? 'IA_RAG' : 'MANUAL';
    return {
      piscinaId: di.piscinaId ?? null,
      produtoId: di.produtoSugeridoId ?? null,
      descricao: di.descricao,
      quantidade,
      precoUnit,
      subtotal,
      origem,
      regraId: di.regraId ?? null,
    };
  });
  const valorTotal = round2(itens.reduce((s, i) => s + i.subtotal, 0));
  return { itens, valorTotal };
}

export { round2 };
