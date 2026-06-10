import { api } from './api';
import { useAuthStore } from '@/stores/auth.store';
import { isDemo } from './demo';

export type StatusIndexacao = 'PENDENTE' | 'INDEXANDO' | 'INDEXADO' | 'FALHA';

export interface Catalogo {
  id: string;
  nome: string;
  fonte: string;
  statusIndexacao: StatusIndexacao;
  totalChunks: number;
  erro?: string | null;
  createdAt: string;
}

export const catalogosApi = {
  list: () => api<Catalogo[]>('/catalogos'),
  reindexar: (id: string) => api<{ status: string }>(`/catalogos/${id}/reindexar`, { method: 'POST' }),

  async upload(file: File): Promise<Catalogo> {
    if (isDemo()) return { id: 'cat-demo', nome: file.name, fonte: 'PDF', statusIndexacao: 'INDEXANDO', totalChunks: 0, createdAt: 'agora' };
    const token = useAuthStore.getState().accessToken;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/v1/catalogos', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error('Falha no upload do catálogo');
    return res.json() as Promise<Catalogo>;
  },
};
