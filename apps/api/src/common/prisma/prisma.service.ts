import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Acesso ao banco via Prisma.
 *
 * Isolamento multi-tenant (ADR-0002): os services SEMPRE filtram por `tenantId`
 * (vindo do RequestContext / JWT). O método `assertTenant` é um guard de defesa
 * em profundidade para uso em mutações sensíveis.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: ['warn', 'error'] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conectado ao PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Garante que uma operação multi-tenant tem tenant definido. */
  assertTenant(tenantId: string | undefined | null): string {
    if (!tenantId) {
      throw new Error('Operação sem tenantId — bloqueada (isolamento multi-tenant).');
    }
    return tenantId;
  }
}
