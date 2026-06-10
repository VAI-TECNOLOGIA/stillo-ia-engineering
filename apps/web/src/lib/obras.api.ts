import { api } from './api';
import type { Paginated } from './clientes.api';

export type ObraStatus =
  | 'RASCUNHO' | 'EM_LEITURA' | 'EM_DIMENSIONAMENTO' | 'EM_ORCAMENTO' | 'CONCLUIDA' | 'ARQUIVADA';

export interface Obra {
  id: string;
  nome: string;
  clienteId: string;
  cliente?: { id: string; nome: string };
  cidade?: string | null;
  uf?: string | null;
  status: ObraStatus;
  createdAt: string;
  _count?: { piscinas: number; arquivos: number };
}

export interface ObraInput {
  clienteId: string;
  nome: string;
  cidade?: string;
  uf?: string;
  regiao?: string;
  observacoes?: string;
}

export interface Piscina {
  id: string;
  nome: string;
  tipo: 'INTERNA' | 'EXTERNA';
  comprimentoM?: number | null;
  larguraM?: number | null;
  profundidadeM?: number | null;
  volumeM3?: number | null;
  origemLeitura: boolean;
  confiancaLeitura?: number | null;
}

export interface ObraDetalhe extends Obra {
  piscinas: Piscina[];
}

export const obrasApi = {
  list(params: { q?: string; clienteId?: string; cursor?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.clienteId) qs.set('clienteId', params.clienteId);
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return api<Paginated<Obra>>(`/obras${query ? `?${query}` : ''}`);
  },
  get(id: string) {
    return api<ObraDetalhe>(`/obras/${id}`);
  },
  create(data: ObraInput) {
    return api<Obra>('/obras', { method: 'POST', body: JSON.stringify(data) });
  },
  remove(id: string) {
    return api<{ id: string }>(`/obras/${id}`, { method: 'DELETE' });
  },
};
