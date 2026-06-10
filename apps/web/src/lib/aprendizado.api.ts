import { api } from './api';

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

export interface KbEntry {
  id: string;
  tipo: string;
  conteudo: string;
  tags: string[];
  createdAt: string;
}

export const aprendizadoApi = {
  estatisticas: () => api<Estatisticas>('/aprendizado/estatisticas'),
  sugestoes: () => api<Padrao[]>('/aprendizado/sugestoes'),
  baseConhecimento: () => api<KbEntry[]>('/aprendizado/base-conhecimento'),
  gerar: () => api<{ criadas: number; analisadas: number }>('/aprendizado/base-conhecimento/gerar', { method: 'POST' }),
};
