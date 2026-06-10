import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { ProjectAnalysisQueue } from './project-analysis.queue';
import { ProjectAnalysisProcessor } from './project-analysis.processor';
import { ProjectValidationService } from './project-validation.service';
import type { Achado, Consolidacao, ResultadoValidacao } from './consolidation.types';
import type { ResolverPendenciaDto } from './project-analysis.dto';

/**
 * Orquestração do motor de leitura v2:
 *  disparar → (fila) classificar+extrair+consolidar+validar → resolver pendências
 *  → confirmar (ETAPA 8) → liberar orçamento (ETAPA 9/10).
 */
@Injectable()
export class ProjectAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ProjectAnalysisQueue,
    private readonly processor: ProjectAnalysisProcessor,
    private readonly validator: ProjectValidationService,
    private readonly audit: AuditService,
  ) {}

  /** Dispara a análise completa: 1 DocumentAnalysis por arquivo da obra. */
  async disparar(tenantId: string, userId: string, obraId: string) {
    const obra = await this.prisma.obra.findFirst({
      where: { id: obraId, tenantId, deletedAt: null },
      include: { arquivos: { orderBy: { createdAt: 'asc' } } },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');
    if (obra.arquivos.length === 0) {
      throw new BadRequestException('Anexe os documentos do projeto (PDFs) antes de analisar.');
    }

    const analise = await this.prisma.projectAnalysis.create({
      data: {
        tenantId,
        obraId,
        status: 'EM_ANALISE',
        geradoById: userId,
        analises: {
          create: obra.arquivos.map((a) => ({ tenantId, arquivoId: a.id, status: 'PENDENTE' })),
        },
      },
      include: { analises: true },
    });

    await this.prisma.obra.update({ where: { id: obraId }, data: { status: 'EM_LEITURA' } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'ANALISE_PROJETO_DISPARADA', entidade: 'ProjectAnalysis', entidadeId: analise.id });

    await this.queue.enqueue(analise.id);
    return this.obterPorId(tenantId, analise.id);
  }

  /** Última análise da obra com documentos. */
  async obter(tenantId: string, obraId: string) {
    return this.prisma.projectAnalysis.findFirst({
      where: { tenantId, obraId },
      orderBy: { createdAt: 'desc' },
      include: { analises: { include: { arquivo: { select: { id: true, nomeOriginal: true } } } } },
    });
  }

  async obterPorId(tenantId: string, id: string) {
    const analise = await this.prisma.projectAnalysis.findFirst({
      where: { id, tenantId },
      include: { analises: { include: { arquivo: { select: { id: true, nomeOriginal: true } } } } },
    });
    if (!analise) throw new NotFoundException('Análise não encontrada.');
    return analise;
  }

  /** Reclassificação manual de um documento (DESCONHECIDO ou classificado errado). */
  async reclassificar(tenantId: string, userId: string, documentAnalysisId: string, documentType: DocumentType) {
    const doc = await this.prisma.documentAnalysis.findFirst({ where: { id: documentAnalysisId, tenantId } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    await this.prisma.documentAnalysis.update({
      where: { id: documentAnalysisId },
      data: {
        documentType,
        status: 'CLASSIFICADO',
        classificacao: { manual: true, confianca: 1, sinais: { usuario: 'classificação manual' } } as object,
        erro: null,
      },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'DOCUMENTO_RECLASSIFICADO', entidade: 'DocumentAnalysis', entidadeId: documentAnalysisId, depois: { documentType } });

    // Reextrai o documento com a disciplina correta e reconsolida o projeto
    await this.processor.processarDocumento(tenantId, documentAnalysisId);
    await this.processor.reconsolidar(doc.projectAnalysisId);
    return this.obterPorId(tenantId, doc.projectAnalysisId);
  }

  /**
   * Resolução humana de pendência/conflito: o valor decidido vira evidência
   * com fonte CONFIRMACAO_HUMANA (rastreável) — nunca um número órfão.
   */
  async resolverPendencia(tenantId: string, userId: string, id: string, dto: ResolverPendenciaDto) {
    const analise = await this.obterPorId(tenantId, id);
    if (analise.status === 'CONFIRMADO') throw new BadRequestException('Análise já confirmada — gere uma nova análise para alterar.');

    const consolidacao = analise.consolidacao as unknown as Consolidacao;
    const corpo = consolidacao.corposDagua?.find((x) => x.nome.toLowerCase() === dto.alvo.toLowerCase());
    if (!corpo) throw new NotFoundException(`Corpo d'água "${dto.alvo}" não encontrado na consolidação.`);

    const campo = corpo[dto.campo];
    campo.valor = dto.valor;
    campo.status = 'CONFIRMADO';
    campo.fontes.push({
      documento: 'CONFIRMACAO_HUMANA',
      documentType: 'CONFIRMACAO_HUMANA',
      fonte: dto.justificativa ? `decisão do usuário: ${dto.justificativa}` : 'decisão do usuário',
      pagina: null,
      valor: dto.valor,
    });
    consolidacao.conflitos = (consolidacao.conflitos ?? []).filter((cf) => !(cf.alvo === corpo.nome && cf.campo === dto.campo));

    await this.prisma.projectAnalysis.update({
      where: { id },
      data: { consolidacao: consolidacao as unknown as object },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'PENDENCIA_RESOLVIDA', entidade: 'ProjectAnalysis', entidadeId: id, depois: { alvo: dto.alvo, campo: dto.campo, valor: dto.valor } });

    // Revalida com o novo dado (recalcula pendências e resumo a partir da consolidação editada)
    await this.revalidar(id, consolidacao);
    return this.obterPorId(tenantId, id);
  }

  private async revalidar(id: string, consolidacao: Consolidacao) {
    const validacao = this.validator.validar(consolidacao);
    const resumo = this.validator.gerarResumo(consolidacao, validacao);
    await this.prisma.projectAnalysis.update({
      where: { id },
      data: {
        validacao: validacao as unknown as object,
        resumo: resumo as unknown as object,
        status: validacao.aprovado ? 'AGUARDANDO_CONFIRMACAO' : 'COM_PENDENCIAS',
      },
    });
  }

  /** ETAPA 8 — confirmação humana. Só permite com validação 100% limpa. */
  async confirmar(tenantId: string, userId: string, id: string) {
    const analise = await this.obterPorId(tenantId, id);
    const validacao = analise.validacao as unknown as ResultadoValidacao;

    if (analise.status === 'CONFIRMADO') return analise;
    if (analise.status !== 'AGUARDANDO_CONFIRMACAO' || !validacao?.aprovado) {
      const pend = [...(validacao?.erros ?? []), ...(validacao?.pendencias ?? [])].map((a: Achado) => a.mensagem);
      throw new BadRequestException({
        status: 'BLOQUEADO',
        motivo: 'Existem pendências ou erros não resolvidos — resolva todos antes de confirmar.',
        pendencias: pend,
      });
    }

    const confirmada = await this.prisma.projectAnalysis.update({
      where: { id },
      data: { status: 'CONFIRMADO', confirmadoById: userId, confirmadoEm: new Date() },
    });
    await this.prisma.obra.update({ where: { id: analise.obraId }, data: { status: 'EM_DIMENSIONAMENTO' } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'ANALISE_PROJETO_CONFIRMADA', entidade: 'ProjectAnalysis', entidadeId: id });
    return confirmada;
  }

  /**
   * ETAPA 9 — TRAVA DE ORÇAMENTO.
   * Consultada pelo OrcamentosService antes de montar qualquer orçamento.
   *  - obra sem análise v2 → libera fluxo legado (retrocompatível)
   *  - análise existente e NÃO confirmada → BLOQUEADO com a lista de pendências
   */
  async verificarLiberacaoOrcamento(tenantId: string, obraId: string): Promise<{ liberado: boolean; status: string; pendencias: string[] }> {
    const analise = await this.prisma.projectAnalysis.findFirst({
      where: { tenantId, obraId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analise) return { liberado: true, status: 'SEM_ANALISE', pendencias: [] };
    if (analise.status === 'CONFIRMADO') return { liberado: true, status: 'CONFIRMADO', pendencias: [] };

    const validacao = analise.validacao as unknown as ResultadoValidacao | null;
    const pendencias = [
      ...(validacao?.erros ?? []).map((a) => a.mensagem),
      ...(validacao?.pendencias ?? []).map((a) => a.mensagem),
    ];
    if (analise.status === 'EM_ANALISE') pendencias.unshift('Análise do projeto ainda em processamento.');
    if (analise.status === 'AGUARDANDO_CONFIRMACAO') pendencias.unshift('Resumo técnico aguardando confirmação do usuário.');
    if (analise.status === 'FALHA') pendencias.unshift(`Análise falhou: ${analise.erro ?? 'erro desconhecido'}.`);

    return { liberado: false, status: 'BLOQUEADO', pendencias };
  }
}
