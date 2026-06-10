import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto da requisição (tenant/usuário) propagado via AsyncLocalStorage.
 * Preenchido pelo AuthGuard a cada request; lido por services/Prisma para
 * forçar o escopo multi-tenant sem precisar passar tenantId em toda assinatura.
 */
export interface RequestContext {
  tenantId: string;
  userId: string;
  role: string;
  requestId?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return als.getStore();
}

export function getTenantId(): string {
  const ctx = als.getStore();
  if (!ctx?.tenantId) throw new Error('RequestContext sem tenantId.');
  return ctx.tenantId;
}
