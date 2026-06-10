import { api } from './api';

export interface IntegracaoStatus {
  openai: {
    vinculado: boolean;
    origem: 'tenant' | 'env' | 'none';
    modelo: string;
    chaveMascarada: string | null;
    vinculadoEm: string | null;
  };
}

export interface VincularOpenAiInput {
  apiKey: string;
  modelo?: string;
  embeddingModel?: string;
  baseUrl?: string;
}

export const configApi = {
  status: () => api<IntegracaoStatus>('/config/integracoes'),
  vincularOpenAi: (data: VincularOpenAiInput) =>
    api<IntegracaoStatus>('/config/integracoes/openai', { method: 'PUT', body: JSON.stringify(data) }),
  testar: () => api<{ ok: boolean; modelo?: string; erro?: string }>('/config/integracoes/openai/testar', { method: 'POST' }),
  desvincular: () => api<IntegracaoStatus>('/config/integracoes/openai', { method: 'DELETE' }),
};
