import { api } from './api';

export interface DimItem {
  id: string;
  categoria: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnit?: number;
  /** Como a IA definiu este item: "Catálogo técnico" | "Regra pré-definida" | "Regra + catálogo" */
  definicao?: string;
  regraId?: string | null;
  regra?: { id: string; nome: string } | null;
  produtoSugerido?: { id: string; sku: string; nome: string; preco: number | string } | null;
  explicacao?: { regraNome?: string; expressaoQuantidade?: string; fatosUsados?: Record<string, unknown> };
}

export interface Dimensionamento {
  id: string;
  obraId: string;
  status: string;
  resumo: { totalItens?: number; avisos?: string[] };
  itens: DimItem[];
  createdAt: string;
}

export const dimensionamentoApi = {
  obter: (obraId: string) => api<Dimensionamento | null>(`/obras/${obraId}/dimensionamento`),
  gerar: (obraId: string) => api<Dimensionamento>(`/obras/${obraId}/dimensionamento`, { method: 'POST' }),
};
