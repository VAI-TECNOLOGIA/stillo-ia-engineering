import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { buildPage, type Paginated } from '../../common/dto/pagination.dto';
import type { CreateObraDto, QueryObraDto, UpdateObraDto } from './dto/obra.dto';

@Injectable()
export class ObrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: QueryObraDto): Promise<Paginated<unknown>> {
    const { cursor, limit, q, clienteId } = query;
    const rows = await this.prisma.obra.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(clienteId ? { clienteId } : {}),
        ...(q ? { nome: { contains: q, mode: 'insensitive' as Prisma.QueryMode } } : {}),
      },
      include: { cliente: { select: { id: true, nome: true } }, _count: { select: { piscinas: true, arquivos: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return buildPage(rows, limit);
  }

  async get(tenantId: string, id: string) {
    const obra = await this.prisma.obra.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { cliente: { select: { id: true, nome: true } }, piscinas: true, arquivos: true },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');
    return obra;
  }

  async create(tenantId: string, userId: string, dto: CreateObraDto) {
    // Garante que o cliente pertence ao mesmo tenant (isolamento).
    const cliente = await this.prisma.cliente.findFirst({ where: { id: dto.clienteId, tenantId, deletedAt: null } });
    if (!cliente) throw new BadRequestException('Cliente inválido para este tenant.');

    const obra = await this.prisma.obra.create({
      data: {
        tenantId,
        createdById: userId,
        clienteId: dto.clienteId,
        nome: dto.nome,
        endereco: dto.endereco,
        cidade: dto.cidade,
        uf: dto.uf,
        regiao: dto.regiao,
        observacoes: dto.observacoes,
        status: dto.status ?? 'RASCUNHO',
      },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'Obra', entidadeId: obra.id, depois: obra });
    return obra;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateObraDto) {
    const antes = await this.prisma.obra.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!antes) throw new NotFoundException('Obra não encontrada.');

    const obra = await this.prisma.obra.update({
      where: { id: antes.id },
      data: {
        nome: dto.nome,
        endereco: dto.endereco,
        cidade: dto.cidade,
        uf: dto.uf,
        regiao: dto.regiao,
        observacoes: dto.observacoes,
        status: dto.status,
      },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'Obra', entidadeId: id, antes, depois: obra });
    return obra;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<{ id: string }> {
    const antes = await this.prisma.obra.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!antes) throw new NotFoundException('Obra não encontrada.');
    await this.prisma.obra.update({ where: { id: antes.id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'DELETE', entidade: 'Obra', entidadeId: id, antes });
    return { id };
  }
}
