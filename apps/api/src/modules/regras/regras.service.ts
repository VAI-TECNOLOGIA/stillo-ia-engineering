import { Injectable, NotFoundException } from '@nestjs/common';
import type { RegraCategoria } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import type { CreateRegraDto, UpdateRegraDto } from './dto';

@Injectable()
export class RegrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, categoria?: RegraCategoria) {
    return this.prisma.regra.findMany({
      where: { tenantId, ...(categoria ? { categoria } : {}) },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async get(tenantId: string, id: string) {
    const regra = await this.prisma.regra.findFirst({ where: { id, tenantId } });
    if (!regra) throw new NotFoundException('Regra não encontrada.');
    return regra;
  }

  listVersoes(tenantId: string, id: string) {
    return this.prisma.regraVersao.findMany({
      where: { regraId: id, regra: { tenantId } },
      orderBy: { versao: 'desc' },
    });
  }

  async create(tenantId: string, userId: string, dto: CreateRegraDto) {
    const regra = await this.prisma.regra.create({
      data: {
        tenantId,
        nome: dto.nome,
        categoria: dto.categoria,
        descricao: dto.descricao,
        prioridade: dto.prioridade ?? 100,
        ativo: dto.ativo ?? true,
        quando: dto.quando as object,
        entao: dto.entao as object,
        versao: 1,
      },
    });
    await this.snapshot(regra, userId);
    await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'Regra', entidadeId: regra.id, depois: regra });
    return regra;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateRegraDto) {
    const antes = await this.get(tenantId, id);
    const regra = await this.prisma.regra.update({
      where: { id: antes.id },
      data: {
        nome: dto.nome,
        categoria: dto.categoria,
        descricao: dto.descricao,
        prioridade: dto.prioridade,
        ativo: dto.ativo,
        quando: dto.quando as object | undefined,
        entao: dto.entao as object | undefined,
        versao: { increment: 1 }, // versionamento
      },
    });
    await this.snapshot(regra, userId); // snapshot da nova versão
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'Regra', entidadeId: id, antes, depois: regra });
    return regra;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<{ id: string }> {
    const antes = await this.get(tenantId, id);
    await this.prisma.regra.delete({ where: { id: antes.id } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'DELETE', entidade: 'Regra', entidadeId: id, antes });
    return { id };
  }

  /** Salva um snapshot imutável da regra (histórico/rollback). */
  private async snapshot(regra: { id: string; versao: number; nome: string; categoria: string; prioridade: number; ativo: boolean; quando: unknown; entao: unknown }, autorId: string) {
    await this.prisma.regraVersao.create({
      data: {
        regraId: regra.id,
        versao: regra.versao,
        autorId,
        snapshot: {
          nome: regra.nome,
          categoria: regra.categoria,
          prioridade: regra.prioridade,
          ativo: regra.ativo,
          quando: regra.quando,
          entao: regra.entao,
        } as object,
      },
    });
  }
}
