import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  tenantId: string;
  autorId?: string;
  acao: string; // CREATE | UPDATE | DELETE | APPROVE | EXPORT | LOGIN ...
  entidade: string;
  entidadeId?: string;
  antes?: unknown;
  depois?: unknown;
  ip?: string;
  userAgent?: string;
}

/**
 * Trilha de auditoria. Nunca deve quebrar a operação de negócio:
 * falha ao gravar log é apenas registrada, não propagada.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          autorId: entry.autorId,
          acao: entry.acao,
          entidade: entry.entidade,
          entidadeId: entry.entidadeId,
          antes: (entry.antes ?? undefined) as object | undefined,
          depois: (entry.depois ?? undefined) as object | undefined,
          ip: entry.ip,
          userAgent: entry.userAgent,
        },
      });
    } catch (e) {
      this.logger.warn(`Falha ao gravar auditoria (${entry.acao} ${entry.entidade}): ${String(e)}`);
    }
  }

  /**
   * Lista logs recentes do tenant, com dados do autor.
   * Usado pelo painel de Acessos (permissão auditoria:ler).
   */
  async listRecent(tenantId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        autor: { select: { id: true, nome: true, email: true, role: true } },
      },
    });
  }
}
