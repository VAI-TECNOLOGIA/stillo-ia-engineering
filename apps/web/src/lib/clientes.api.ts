import { api } from './api';

export interface Contato {
  tipo: string;
  valor: string;
}

export interface Cliente {
  id: string;
  nome: string;
  documento?: string | null;
  contatos?: Contato[];
  endereco?: Record<string, unknown> | null;
  observacoes?: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ClienteInput {
  nome: string;
  documento?: string;
  contatos?: Contato[];
  observacoes?: string;
}

export const clientesApi = {
  list(params: { q?: string; cursor?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return api<Paginated<Cliente>>(`/clientes${query ? `?${query}` : ''}`);
  },
  create(data: ClienteInput) {
    return api<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(data) });
  },
  update(id: string, data: Partial<ClienteInput>) {
    return api<Cliente>(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  remove(id: string) {
    return api<{ id: string }>(`/clientes/${id}`, { method: 'DELETE' });
  },
};
