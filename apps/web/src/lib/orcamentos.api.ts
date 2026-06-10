import { api } from './api';
import { useAuthStore } from '@/stores/auth.store';
import { isDemo, demoExport } from './demo';

export type OrcamentoStatus = 'RASCUNHO' | 'EM_REVISAO' | 'APROVADO' | 'ENVIADO' | 'RECUSADO';
export type ItemOrigem = 'REGRA' | 'IA_RAG' | 'MANUAL';
export type FormatoExport = 'pdf' | 'doc' | 'csv' | 'txt';

export interface OrcItem {
  id: string;
  descricao: string;
  quantidade: number;
  precoUnit: number | string;
  subtotal: number | string;
  origem: ItemOrigem;
  produto?: { id: string; sku: string; nome: string } | null;
  regra?: { id: string; nome: string } | null;
  piscina?: { id: string; nome: string } | null;
}

export interface Orcamento {
  id: string;
  numero: number;
  status: OrcamentoStatus;
  valorTotal: number | string;
  versaoAtual: number;
  obra?: { id: string; nome: string; cliente?: { nome: string } | null } | null;
  itens: OrcItem[];
}

export interface OrcamentoResumo {
  id: string;
  numero: number;
  status: OrcamentoStatus;
  valorTotal: number | string;
  createdAt: string;
  obra?: { nome: string; cliente?: { nome: string } | null } | null;
}

export interface AtualizarItemInput {
  descricao?: string;
  quantidade?: number;
  precoUnit?: number;
  produtoId?: string;
  justificativa?: string;
}

export const orcamentosApi = {
  criarDaObra: (obraId: string) => api<Orcamento>(`/obras/${obraId}/orcamentos`, { method: 'POST' }),
  list: () => api<OrcamentoResumo[]>('/orcamentos'),
  get: (id: string) => api<Orcamento>(`/orcamentos/${id}`),
  atualizarItem: (id: string, itemId: string, dto: AtualizarItemInput) =>
    api<Orcamento>(`/orcamentos/${id}/itens/${itemId}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  adicionarItem: (id: string, dto: { descricao: string; quantidade: number; precoUnit: number; justificativa?: string }) =>
    api<Orcamento>(`/orcamentos/${id}/itens`, { method: 'POST', body: JSON.stringify(dto) }),
  removerItem: (id: string, itemId: string, justificativa?: string) =>
    api<Orcamento>(`/orcamentos/${id}/itens/${itemId}${justificativa ? `?justificativa=${encodeURIComponent(justificativa)}` : ''}`, { method: 'DELETE' }),
  aprovar: (id: string) => api<Orcamento>(`/orcamentos/${id}/aprovar`, { method: 'POST' }),
  criarVersao: (id: string) => api<{ versao: number }>(`/orcamentos/${id}/versoes`, { method: 'POST' }),

  async exportar(id: string, formato: FormatoExport): Promise<string> {
    if (isDemo()) return demoExport(formato);
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`/api/v1/orcamentos/${id}/exportar?formato=${formato}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Falha ao exportar');
    return res.text();
  },
};
