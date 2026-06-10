import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { buildPage, type Paginated } from '../../common/dto/pagination.dto';
import { ProdutoIndexer } from './produto-indexer.service';
import type { CreateProdutoDto, QueryProdutoDto, RelacaoDto, UpdateProdutoDto } from './dto';

@Injectable()
export class ProdutosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly indexer: ProdutoIndexer,
  ) {}

  async list(tenantId: string, query: QueryProdutoDto): Promise<Paginated<unknown>> {
    const { cursor, limit, q, categoria } = query;
    const rows = await this.prisma.produto.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(categoria ? { categoria } : {}),
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
                { sku: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
                { fabricante: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return buildPage(rows, limit);
  }

  async get(tenantId: string, id: string) {
    const produto = await this.prisma.produto.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        relacoesOrigem: { include: { relacionado: { select: { id: true, sku: true, nome: true } } } },
      },
    });
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    return produto;
  }

  async create(tenantId: string, userId: string, dto: CreateProdutoDto) {
    try {
      const produto = await this.prisma.produto.create({
        data: {
          tenantId,
          sku: dto.sku,
          nome: dto.nome,
          categoria: dto.categoria,
          fabricante: dto.fabricante,
          modelo: dto.modelo,
          unidade: dto.unidade ?? 'un',
          preco: dto.preco ?? 0,
          status: dto.status ?? 'ATIVO',
          especificacoes: (dto.especificacoes ?? {}) as object,
          observacoes: dto.observacoes,
        },
      });
      void this.indexer.indexar(tenantId, produto.id); // embedding em background (best-effort)
      await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'Produto', entidadeId: produto.id, depois: produto });
      return produto;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Já existe um produto com o SKU "${dto.sku}".`);
      }
      throw e;
    }
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateProdutoDto) {
    const antes = await this.get(tenantId, id);
    const produto = await this.prisma.produto.update({
      where: { id: antes.id },
      data: {
        sku: dto.sku,
        nome: dto.nome,
        categoria: dto.categoria,
        fabricante: dto.fabricante,
        modelo: dto.modelo,
        unidade: dto.unidade,
        preco: dto.preco,
        status: dto.status,
        especificacoes: dto.especificacoes as object | undefined,
        observacoes: dto.observacoes,
      },
    });
    void this.indexer.indexar(tenantId, produto.id);
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'Produto', entidadeId: id, antes, depois: produto });
    return produto;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<{ id: string }> {
    const antes = await this.get(tenantId, id);
    await this.prisma.produto.update({ where: { id: antes.id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'DELETE', entidade: 'Produto', entidadeId: id, antes });
    return { id };
  }

  async addRelacao(tenantId: string, userId: string, produtoId: string, dto: RelacaoDto) {
    await this.get(tenantId, produtoId);
    const rel = await this.prisma.produto.findFirst({ where: { id: dto.relacionadoId, tenantId, deletedAt: null } });
    if (!rel) throw new BadRequestException('Produto relacionado inválido.');
    if (rel.id === produtoId) throw new BadRequestException('Um produto não se relaciona consigo mesmo.');
    const relacao = await this.prisma.produtoRelacao.create({
      data: { tenantId, produtoId, relacionadoId: dto.relacionadoId, tipo: dto.tipo, nota: dto.nota },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'ProdutoRelacao', entidadeId: relacao.id, depois: relacao });
    return relacao;
  }

  async removeRelacao(tenantId: string, userId: string, relacaoId: string): Promise<{ id: string }> {
    const rel = await this.prisma.produtoRelacao.findFirst({ where: { id: relacaoId, tenantId } });
    if (!rel) throw new NotFoundException('Relação não encontrada.');
    await this.prisma.produtoRelacao.delete({ where: { id: relacaoId } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'DELETE', entidade: 'ProdutoRelacao', entidadeId: relacaoId });
    return { id: relacaoId };
  }
}
