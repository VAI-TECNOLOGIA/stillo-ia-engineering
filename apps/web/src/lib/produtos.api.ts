import { api } from './api';
import type { Paginated } from './clientes.api';

export type ProdutoStatus = 'ATIVO' | 'INATIVO' | 'DESCONTINUADO';

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  fabricante?: string | null;
  modelo?: string | null;
  unidade: string;
  preco: number | string;
  status: ProdutoStatus;
  especificacoes?: Record<string, unknown>;
  observacoes?: string | null;
}

export interface ProdutoInput {
  sku: string;
  nome: string;
  categoria: string;
  fabricante?: string;
  modelo?: string;
  unidade?: string;
  preco?: number;
  status?: ProdutoStatus;
}

export const produtosApi = {
  list(params: { q?: string; categoria?: string; cursor?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.categoria) qs.set('categoria', params.categoria);
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return api<Paginated<Produto>>(`/produtos${query ? `?${query}` : ''}`);
  },
  create: (d: ProdutoInput) => api<Produto>('/produtos', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: Partial<ProdutoInput>) => api<Produto>(`/produtos/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  remove: (id: string) => api<{ id: string }>(`/produtos/${id}`, { method: 'DELETE' }),
  buscar: (q: string, categoria?: string) => api<Produto[]>(`/produtos/buscar?q=${encodeURIComponent(q)}${categoria ? `&categoria=${categoria}` : ''}`),
};
