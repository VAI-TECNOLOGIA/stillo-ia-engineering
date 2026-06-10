import { api } from './api';

export interface Fonte {
  produtoId: string;
  sku: string;
  nome: string;
}

export interface ChatResposta {
  conversaId: string;
  resposta: string;
  fontes: Fonte[];
}

export const iaApi = {
  chat: (mensagem: string, conversaId?: string) =>
    api<ChatResposta>('/ia/chat', { method: 'POST', body: JSON.stringify({ mensagem, conversaId }) }),
};
