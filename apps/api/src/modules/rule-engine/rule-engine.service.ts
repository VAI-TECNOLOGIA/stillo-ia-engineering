import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProdutoSearchService } from '../produtos/produto-search.service';
import { construirFatos, type ObraInput, type PiscinaInput } from './fact-builder';
import { avaliarRegras } from './engine';
import type { Acao, Condicao, RegraAvaliavel, ResultadoAvaliacao } from './types';

/**
 * Ponte entre o motor (domínio puro) e a persistência.
 * - Carrega regras ativas do tenant.
 * - Deriva fatos de cada piscina da obra.
 * - Avalia e persiste o Dimensionamento + itens (rastreáveis).
 */
@Injectable()
export class RuleEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: ProdutoSearchService,
  ) {}

  /** Carrega regras do tenant no formato avaliável. */
  private async carregarRegras(tenantId: string): Promise<RegraAvaliavel[]> {
    const regras = await this.prisma.regra.findMany({
      where: { tenantId, ativo: true },
      orderBy: { prioridade: 'desc' },
    });
    return regras.map((r) => ({
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      prioridade: r.prioridade,
      ativo: r.ativo,
      quando: r.quando as unknown as Condicao,
      entao: r.entao as unknown as Acao[],
    }));
  }

  /** "GERAR DIMENSIONAMENTO": avalia todas as piscinas da obra e persiste. */
  async gerarDimensionamento(tenantId: string, obraId: string, userId: string) {
    const obra = await this.prisma.obra.findFirst({
      where: { id: obraId, tenantId },
      include: { piscinas: { include: { sistemas: true } } },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    const regras = await this.carregarRegras(tenantId);
    const obraInput: ObraInput = { cidade: obra.cidade, uf: obra.uf, regiao: obra.regiao };

    const dim = await this.prisma.dimensionamento.create({
      data: { tenantId, obraId, status: 'PROCESSANDO', geradoById: userId },
    });

    const avisosGerais: string[] = [];
    let totalItens = 0;

    for (const piscina of obra.piscinas) {
      const input: PiscinaInput = {
        id: piscina.id,
        nome: piscina.nome,
        tipo: piscina.tipo,
        comprimentoM: piscina.comprimentoM,
        larguraM: piscina.larguraM,
        profundidadeM: piscina.profundidadeM,
        sistemas: piscina.sistemas.filter((s) => s.ativo).map((s) => s.tipo),
      };
      const fatos = construirFatos(input, obraInput);
      const resultado = avaliarRegras(regras, fatos);
      avisosGerais.push(...resultado.avisos);

      for (const item of resultado.itens) {
        // RAG/lexical: sugere um SKU real do catálogo para a necessidade técnica.
        const sugerido = await this.search
          .selecionarParaItem(tenantId, item.categoria, item.descricao)
          .catch(() => null);
        await this.prisma.dimensionamentoItem.create({
          data: {
            dimensionamentoId: dim.id,
            piscinaId: piscina.id,
            categoria: item.categoria,
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            regraId: item.regraId,
            produtoSugeridoId: sugerido?.id,
            explicacao: item.explicacao as unknown as object,
          },
        });
        totalItens++;
      }
    }

    return this.prisma.dimensionamento.update({
      where: { id: dim.id },
      data: { status: 'CONCLUIDO', resumo: { totalItens, avisos: avisosGerais } },
      include: { itens: true },
    });
  }

  /** Último dimensionamento da obra com itens (origem rastreável). */
  obterDimensionamento(tenantId: string, obraId: string) {
    return this.prisma.dimensionamento.findFirst({
      where: { tenantId, obraId },
      orderBy: { createdAt: 'desc' },
      include: {
        itens: {
          include: {
            regra: { select: { id: true, nome: true } },
            produtoSugerido: { select: { id: true, sku: true, nome: true, preco: true } },
          },
          orderBy: { categoria: 'asc' },
        },
      },
    });
  }

  /** Dry-run: testa uma regra (ou payload) contra uma piscina de exemplo, sem persistir. */
  simularRegra(regra: RegraAvaliavel, piscina: PiscinaInput, obra: ObraInput = {}): ResultadoAvaliacao {
    const fatos = construirFatos(piscina, obra);
    return avaliarRegras([{ ...regra, ativo: true }], fatos);
  }
}
