import { api } from './api';

export interface AuditLog {
  id: string;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  autor?: {
    id: string;
    nome: string;
    email: string;
    role: string;
  } | null;
}

export const auditApi = {
  recent: (limit = 100) => api<AuditLog[]>(`/audit/recent?limit=${limit}`),
};
