import { api } from './api';

export type RegraCategoria =
  | 'ILUMINACAO' | 'HIDRAULICA' | 'FILTRAGEM' | 'AQUECIMENTO' | 'TRATAMENTO' | 'MAO_DE_OBRA' | 'ESTRUTURA';

export const CATEGORIAS: RegraCategoria[] = ['ILUMINACAO', 'HIDRAULICA', 'FILTRAGEM', 'AQUECIMENTO', 'TRATAMENTO', 'MAO_DE_OBRA', 'ESTRUTURA'];

export interface Regra {
  id: string;
  nome: string;
  categoria: RegraCategoria;
  descricao?: string | null;
  prioridade: number;
  ativo: boolean;
  quando: unknown;
  entao: unknown[];
  versao: number;
  createdAt: string;
}

export interface RegraInput {
  nome: string;
  categoria: RegraCategoria;
  descricao?: string;
  prioridade?: number;
  ativo?: boolean;
  quando: unknown;
  entao: unknown[];
}

export interface SimulacaoResultado {
  itens: { categoria: string; descricao: string; quantidade: number; unidade: string }[];
  avisos: string[];
  regrasDisparadas: string[];
}

export const regrasApi = {
  list: () => api<Regra[]>('/regras'),
  create: (d: RegraInput) => api<Regra>('/regras', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: Partial<RegraInput>) => api<Regra>(`/regras/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  remove: (id: string) => api<{ id: string }>(`/regras/${id}`, { method: 'DELETE' }),
  simular: (regra: unknown, piscina: unknown, obra?: unknown) =>
    api<SimulacaoResultado>('/regras/simular', { method: 'POST', body: JSON.stringify({ regra, piscina, obra }) }),
};
