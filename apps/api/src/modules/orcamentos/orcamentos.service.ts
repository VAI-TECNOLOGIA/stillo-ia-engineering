import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Orcamento } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { ProjectAnalysisService } from '../project-analysis/project-analysis.service';
import { montarItensOrcamento, round2 } from './orcamento-builder';
import type { AdicionarItemDto, AtualizarItemDto } from './dto';

const ITEM_INCLUDE = {
  produto: { select: { id: true, sku: true, nome: true } },
  regra: { select: { id: true, nome: true } },
  piscina: { select: { id: true, nome: true } },
} as const;

@Injectable()
export class OrcamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly projectAnalysis: ProjectAnalysisService,
  ) {}

  /** Monta um orçamento a partir do último dimensionamento concluído da obra. */
  async criar(tenantId: string, userId: string, obraId: string) {
    const obra = await this.prisma.obra.findFirst({ where: { id: obraId, tenantId, deletedAt: null } });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    // ETAPA 9 — TRAVA: análise de projeto incompleta/não confirmada BLOQUEIA o orçamento.
    const liberacao = await this.projectAnalysis.verificarLiberacaoOrcamento(tenantId, obraId);
    if (!liberacao.liberado) {
      throw new BadRequestException({
        status: 'BLOQUEADO',
        motivo: 'A análise técnica do projeto precisa estar completa e confirmada antes de gerar o orçamento.',
        pendencias: liberacao.pendencias,
      });
    }

    const dim = await this.prisma.dimensionamento.findFirst({
      where: { tenantId, obraId, status: 'CONCLUIDO' },
      orderBy: { createdAt: 'desc' },
      include: { itens: { include: { produtoSugerido: { select: { id: true, preco: true } } } } },
    });
    if (!dim || dim.itens.length === 0) {
      throw new BadRequestException('Gere o dimensionamento da obra antes de montar o orçamento.');
    }

    const { itens, valorTotal } = montarItensOrcamento(
      dim.itens.map((i) => ({
        piscinaId: i.piscinaId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        regraId: i.regraId,
        produtoSugeridoId: i.produtoSugeridoId,
        produtoSugerido: i.produtoSugerido ? { id: i.produtoSugerido.id, preco: Number(i.produtoSugerido.preco) } : null,
      })),
    );

    const agg = await this.prisma.orcamento.aggregate({ where: { tenantId }, _max: { numero: true } });
    const numero = (agg._max.numero ?? 0) + 1;

    const orc = await this.prisma.orcamento.create({
      data: {
        tenantId,
        obraId,
        numero,
        status: 'RASCUNHO',
        valorTotal,
        versaoAtual: 1,
        createdById: userId,
        itens: {
          create: itens.map((it) => ({
            piscinaId: it.piscinaId,
            produtoId: it.produtoId,
            descricao: it.descricao,
            quantidade: it.quantidade,
            precoUnit: it.precoUnit,
            subtotal: it.subtotal,
            origem: it.origem,
            regraId: it.regraId,
          })),
        },
      },
    });
    await this.snapshot(orc.id, userId);
    await this.prisma.obra.update({ where: { id: obraId }, data: { status: 'EM_ORCAMENTO' } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'Orcamento', entidadeId: orc.id, depois: { numero, valorTotal } });
    return this.get(tenantId, orc.id);
  }

  async get(tenantId: string, id: string) {
    const orc = await this.prisma.orcamento.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        obra: { select: { id: true, nome: true, cliente: { select: { nome: true } } } },
        itens: { include: ITEM_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!orc) throw new NotFoundException('Orçamento não encontrado.');
    return orc;
  }

  list(tenantId: string) {
    return this.prisma.orcamento.findMany({
      where: { tenantId, deletedAt: null },
      include: { obra: { select: { nome: true, cliente: { select: { nome: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async adicionarItem(tenantId: string, userId: string, orcId: string, dto: AdicionarItemDto) {
    const orc = await this.getOrThrow(tenantId, orcId);
    this.assertEditavel(orc);
    const subtotal = round2(dto.quantidade * dto.precoUnit);
    const item = await this.prisma.orcamentoItem.create({
      data: { orcamentoId: orcId, produtoId: dto.produtoId, piscinaId: dto.piscinaId, descricao: dto.descricao, quantidade: dto.quantidade, precoUnit: dto.precoUnit, subtotal, origem: 'MANUAL' },
    });
    await this.prisma.correcao.create({ data: { tenantId, orcamentoItemId: item.id, entidade: 'OrcamentoItem', de: {} as object, para: { descricao: dto.descricao, quantidade: dto.quantidade } as object, justificativa: dto.justificativa ?? 'Item adicionado manualmente', autorId: userId } });
    await this.recompute(orcId);
    await this.marcarRevisao(orc);
    await this.audit.log({ tenantId, autorId: userId, acao: 'CREATE', entidade: 'OrcamentoItem', entidadeId: item.id });
    return this.get(tenantId, orcId);
  }

  async atualizarItem(tenantId: string, userId: string, orcId: string, itemId: string, dto: AtualizarItemDto) {
    const orc = await this.getOrThrow(tenantId, orcId);
    this.assertEditavel(orc);
    const item = await this.prisma.orcamentoItem.findFirst({ where: { id: itemId, orcamentoId: orcId } });
    if (!item) throw new NotFoundException('Item não encontrado.');

    const antes = { produtoId: item.produtoId, descricao: item.descricao, quantidade: item.quantidade, precoUnit: Number(item.precoUnit) };
    const quantidade = dto.quantidade ?? item.quantidade;
    const precoUnit = dto.precoUnit ?? Number(item.precoUnit);
    const trocouProduto = dto.produtoId !== undefined && dto.produtoId !== item.produtoId;

    const novo = await this.prisma.orcamentoItem.update({
      where: { id: itemId },
      data: {
        produtoId: dto.produtoId ?? item.produtoId,
        descricao: dto.descricao ?? item.descricao,
        quantidade,
        precoUnit,
        subtotal: round2(quantidade * precoUnit),
        origem: trocouProduto ? 'MANUAL' : item.origem,
      },
    });
    // Aprendizado: registra a correção humana (de → para + justificativa).
    await this.prisma.correcao.create({
      data: {
        tenantId, orcamentoItemId: itemId, entidade: 'OrcamentoItem',
        de: antes as object,
        para: { produtoId: novo.produtoId, descricao: novo.descricao, quantidade: novo.quantidade, precoUnit: Number(novo.precoUnit) } as object,
        justificativa: dto.justificativa, autorId: userId,
      },
    });
    await this.recompute(orcId);
    await this.marcarRevisao(orc);
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'OrcamentoItem', entidadeId: itemId, antes, depois: novo });
    return this.get(tenantId, orcId);
  }

  async removerItem(tenantId: string, userId: string, orcId: string, itemId: string, justificativa?: string) {
    const orc = await this.getOrThrow(tenantId, orcId);
    this.assertEditavel(orc);
    const item = await this.prisma.orcamentoItem.findFirst({ where: { id: itemId, orcamentoId: orcId } });
    if (!item) throw new NotFoundException('Item não encontrado.');
    await this.prisma.correcao.create({ data: { tenantId, orcamentoItemId: null, entidade: 'OrcamentoItem', de: { descricao: item.descricao, quantidade: item.quantidade } as object, para: {} as object, justificativa: justificativa ?? 'Item removido', autorId: userId } });
    await this.prisma.orcamentoItem.delete({ where: { id: itemId } });
    await this.recompute(orcId);
    await this.marcarRevisao(orc);
    await this.audit.log({ tenantId, autorId: userId, acao: 'DELETE', entidade: 'OrcamentoItem', entidadeId: itemId });
    return this.get(tenantId, orcId);
  }

  async criarVersao(tenantId: string, userId: string, orcId: string) {
    const orc = await this.getOrThrow(tenantId, orcId);
    const novaVersao = orc.versaoAtual + 1;
    await this.prisma.orcamento.update({ where: { id: orcId }, data: { versaoAtual: novaVersao } });
    await this.snapshot(orcId, userId);
    await this.audit.log({ tenantId, autorId: userId, acao: 'VERSION', entidade: 'Orcamento', entidadeId: orcId, depois: { versao: novaVersao } });
    return { versao: novaVersao };
  }

  async aprovar(tenantId: string, userId: string, orcId: string) {
    const orc = await this.getOrThrow(tenantId, orcId);
    const total = await this.prisma.orcamentoItem.count({ where: { orcamentoId: orcId } });
    if (total === 0) throw new BadRequestException('Orçamento sem itens não pode ser aprovado.');
    await this.prisma.orcamento.update({ where: { id: orcId }, data: { status: 'APROVADO', aprovadoById: userId, aprovadoEm: new Date() } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'APPROVE', entidade: 'Orcamento', entidadeId: orcId });
    return this.get(tenantId, orcId);
  }

  listarVersoes(tenantId: string, orcId: string) {
    return this.prisma.orcamentoVersao.findMany({ where: { orcamentoId: orcId, orcamento: { tenantId } }, orderBy: { versao: 'desc' } });
  }

  async compararVersoes(tenantId: string, orcId: string, a: number, b: number) {
    const versoes = await this.prisma.orcamentoVersao.findMany({ where: { orcamentoId: orcId, orcamento: { tenantId }, versao: { in: [a, b] } } });
    const va = versoes.find((v) => v.versao === a);
    const vb = versoes.find((v) => v.versao === b);
    if (!va || !vb) throw new NotFoundException('Versão não encontrada.');
    return { a: va.snapshot, b: vb.snapshot };
  }

  // ── internos ──────────────────────────────────────────────────────────────

  private async getOrThrow(tenantId: string, id: string): Promise<Orcamento> {
    const orc = await this.prisma.orcamento.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado.');
    return orc;
  }

  private assertEditavel(orc: Orcamento): void {
    if (orc.status === 'APROVADO' || orc.status === 'ENVIADO') {
      throw new BadRequestException('Orçamento aprovado/enviado não pode ser editado.');
    }
  }

  private async marcarRevisao(orc: Orcamento): Promise<void> {
    if (orc.status === 'RASCUNHO') {
      await this.prisma.orcamento.update({ where: { id: orc.id }, data: { status: 'EM_REVISAO' } });
    }
  }

  private async recompute(orcId: string): Promise<void> {
    const itens = await this.prisma.orcamentoItem.findMany({ where: { orcamentoId: orcId } });
    const total = round2(itens.reduce((s, i) => s + Number(i.subtotal), 0));
    await this.prisma.orcamento.update({ where: { id: orcId }, data: { valorTotal: total } });
  }

  private async snapshot(orcId: string, autorId: string): Promise<void> {
    const orc = await this.prisma.orcamento.findUnique({ where: { id: orcId }, include: { itens: true } });
    if (!orc) return;
    await this.prisma.orcamentoVersao.create({
      data: { orcamentoId: orcId, versao: orc.versaoAtual, autorId, snapshot: { valorTotal: orc.valorTotal, itens: orc.itens } as unknown as object },
    });
  }
}
