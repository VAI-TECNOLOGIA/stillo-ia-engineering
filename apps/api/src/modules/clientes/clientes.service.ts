import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { buildPage, type Paginated, type PaginationQueryDto } from '../../common/dto/pagination.dto';
import type { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: PaginationQueryDto): Promise<Paginated<unknown>> {
    const { cursor, limit, q } = query;
    const rows = await this.prisma.cliente.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(q ? { nome: { contains: q, mode: 'insensitive' as Prisma.QueryMode } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return buildPage(rows, limit);
  }

  async get(tenantId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    return cliente;
  }

  async create(tenantId: string, userId: string, dto: CreateClienteDto) {
    const cliente = await this.prisma.cliente.create({
      data: {
        tenantId,
        createdById: userId,
        nome: dto.nome,
        documento: dto.documento,
        contatos: (dto.contatos ?? []) as object,
        endereco: (dto.endereco ?? undefined) as object | undefined,
        observacoes: dto.observacoes,
      },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'Cliente', entidadeId: cliente.id, depois: cliente });
    return cliente;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateClienteDto) {
    const antes = await this.get(tenantId, id);
    const cliente = await this.prisma.cliente.update({
      where: { id: antes.id },
      data: {
        nome: dto.nome,
        documento: dto.documento,
        contatos: dto.contatos as object | undefined,
        endereco: dto.endereco as object | undefined,
        observacoes: dto.observacoes,
      },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'Cliente', entidadeId: id, antes, depois: cliente });
    return cliente;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<{ id: string }> {
    const antes = await this.get(tenantId, id);
    await this.prisma.cliente.update({ where: { id: antes.id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'DELETE', entidade: 'Cliente', entidadeId: id, antes });
    return { id };
  }
}
