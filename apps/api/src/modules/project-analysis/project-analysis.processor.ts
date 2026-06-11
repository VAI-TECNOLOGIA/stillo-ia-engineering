import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../common/storage/storage.types';
import { OcrService } from '../leitura/ocr.service';
import { DocumentClassifierService } from './document-classifier.service';
import { ExtractorRegistry } from './extractors/extractor.registry';
import { PdfRasterService } from './pdf-raster.service';
import { ProjectConsolidatorService } from './project-consolidator.service';
import { ProjectValidationService } from './project-validation.service';
import type { DocumentoAnalisado } from './consolidation.types';

/**
 * Pipeline completo do motor de leitura v2 (por ProjectAnalysis):
 *   para cada PDF:  OCR → ETAPA 1 classificar → ETAPA 2 extrair (disciplina)
 *   depois:         ETAPA 4 consolidar → ETAPA 7 validar → ETAPA 8 resumo
 *   status final:   AGUARDANDO_CONFIRMACAO (sem pendências) | COM_PENDENCIAS
 * Chamado pela fila (BullMQ) ou inline (dev) — mesmo padrão de LeituraQueue.
 */
@Injectable()
export class ProjectAnalysisProcessor {
  private readonly logger = new Logger(ProjectAnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: OcrService,
    private readonly classifier: DocumentClassifierService,
    private readonly registry: ExtractorRegistry,
    private readonly raster: PdfRasterService,
    private readonly consolidator: ProjectConsolidatorService,
    private readonly validator: ProjectValidationService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async process(projectAnalysisId: string): Promise<void> {
    const analise = await this.prisma.projectAnalysis.findUnique({
      where: { id: projectAnalysisId },
      include: { analises: { include: { arquivo: true } } },
    });
    if (!analise) return;

    try {
      const documentos: DocumentoAnalisado[] = [];

      // ── Por documento: OCR → classificar → extrair (nunca misturar disciplinas)
      for (const doc of analise.analises) {
        documentos.push(await this.processarDocumento(analise.tenantId, doc.id));
      }

      // ── Consolidação (ETAPA 4) + validação (ETAPA 7) + resumo (ETAPA 8)
      const consolidacao = this.consolidator.consolidar(documentos);
      const validacao = this.validator.validar(consolidacao);
      const resumo = this.validator.gerarResumo(consolidacao, validacao);

      await this.prisma.projectAnalysis.update({
        where: { id: projectAnalysisId },
        data: {
          consolidacao: consolidacao as unknown as object,
          validacao: validacao as unknown as object,
          resumo: resumo as unknown as object,
          // Sem pendências → pronto p/ confirmação humana. Com pendências → bloqueado até resolver.
          status: validacao.aprovado ? 'AGUARDANDO_CONFIRMACAO' : 'COM_PENDENCIAS',
          erro: null,
        },
      });
    } catch (e) {
      this.logger.error(`ProjectAnalysis ${projectAnalysisId} falhou: ${String(e)}`);
      await this.prisma.projectAnalysis.update({
        where: { id: projectAnalysisId },
        data: { status: 'FALHA', erro: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  /** Reprocessa só a consolidação/validação (após resolução manual ou reclassificação). */
  async reconsolidar(projectAnalysisId: string): Promise<void> {
    const analise = await this.prisma.projectAnalysis.findUnique({
      where: { id: projectAnalysisId },
      include: { analises: { include: { arquivo: true } } },
    });
    if (!analise) return;

    const documentos: DocumentoAnalisado[] = analise.analises.map((d) => ({
      documentAnalysisId: d.id,
      arquivoId: d.arquivoId,
      nomeArquivo: d.arquivo.nomeOriginal,
      documentType: d.documentType,
      extracao: d.status === 'EXTRAIDO' ? (d.extracao as unknown) : null,
      erro: d.erro,
    }));

    const consolidacao = this.consolidator.consolidar(documentos);
    const validacao = this.validator.validar(consolidacao);
    const resumo = this.validator.gerarResumo(consolidacao, validacao);

    await this.prisma.projectAnalysis.update({
      where: { id: projectAnalysisId },
      data: {
        consolidacao: consolidacao as unknown as object,
        validacao: validacao as unknown as object,
        resumo: resumo as unknown as object,
        status: validacao.aprovado ? 'AGUARDANDO_CONFIRMACAO' : 'COM_PENDENCIAS',
      },
    });
  }

  /** Pipeline de UM documento: OCR (com cache) → classificação → extração da disciplina. */
  async processarDocumento(tenantId: string, documentAnalysisId: string): Promise<DocumentoAnalisado> {
    const doc = await this.prisma.documentAnalysis.findUnique({
      where: { id: documentAnalysisId },
      include: { arquivo: true },
    });
    if (!doc) throw new Error(`DocumentAnalysis ${documentAnalysisId} não encontrada.`);

    const base: DocumentoAnalisado = {
      documentAnalysisId: doc.id,
      arquivoId: doc.arquivoId,
      nomeArquivo: doc.arquivo.nomeOriginal,
      documentType: doc.documentType,
      extracao: null,
    };

    try {
      // 1. CAPTURA DO CONTEÚDO — dois canais:
      //    texto por página ([pág N]) + páginas rasterizadas p/ VISÃO quando a
      //    prancha é gráfica (planta CAD) ou o PDF é escaneado (sem texto).
      const buffer = await this.storage.get(doc.arquivo.storageKey);
      const ocr = await this.ocr.extract(buffer, doc.arquivo.mimeType, doc.arquivo.nomeOriginal);
      const texto = ocr.texto;
      await this.prisma.arquivo.update({
        where: { id: doc.arquivo.id },
        data: {
          textoExtraido: texto.slice(0, 100_000),
          ocrConfianca: ocr.confianca,
          statusProcessamento: ocr.confianca < 0.5 ? 'REVISAO_MANUAL' : 'CONCLUIDO',
        },
      });

      const ehPdf = doc.arquivo.mimeType === 'application/pdf' || doc.arquivo.nomeOriginal.toLowerCase().endsWith('.pdf');
      // Visão p/ CLASSIFICAÇÃO: só se escaneado ou prancha gráfica (carimbo como imagem).
      let imagens: string[] = ehPdf && (ocr.metodo === 'sem-texto' || PdfRasterService.ehPranchaGrafica(ocr.paginas))
        ? await this.raster.paginasComoImagens(buffer)
        : [];

      // 2. ETAPA 1 — classificar ANTES de extrair (pula se já classificado manualmente)
      await this.prisma.documentAnalysis.update({ where: { id: doc.id }, data: { status: 'CLASSIFICANDO' } });
      let documentType = doc.documentType;
      const jaClassificadoManual = (doc.classificacao as { manual?: boolean } | null)?.manual === true;
      if (!jaClassificadoManual) {
        const cls = await this.classifier.classificar(tenantId, doc.arquivo.nomeOriginal, texto, imagens[0]);
        documentType = cls.documentType;
        await this.prisma.documentAnalysis.update({
          where: { id: doc.id },
          data: {
            documentType,
            status: 'CLASSIFICADO',
            classificacao: { confianca: cls.confianca, sinais: cls.sinais, leituraVisual: imagens.length > 0 } as object,
          },
        });
      }
      base.documentType = documentType;

      // 3. ETAPA 2 — extração especializada (DESCONHECIDO não extrai: vira pendência)
      const extractor = this.registry.get(documentType);
      if (!extractor) {
        await this.prisma.documentAnalysis.update({
          where: { id: doc.id },
          data: { status: 'FALHA', erro: 'Documento sem disciplina identificada — classifique manualmente.' },
        });
        base.erro = 'sem disciplina';
        return base;
      }

      // VISÃO PARA EXTRAÇÃO: plantas CAD têm o texto EMBARALHADO (cotas/labels sem
      // posição) — o texto-sopa não basta. Forçar leitura por IMAGEM nas disciplinas
      // de geometria/equipamentos, mesmo havendo texto. Memorial é texto puro (não precisa).
      const DISCIPLINAS_VISAO = new Set<string>([
        'ARQUITETONICO', 'CORTES', 'DETALHES_EXECUTIVOS', 'IMPLANTACAO', 'LAZER',
        'PAISAGISMO', 'ESTRUTURAL', 'HIDRAULICO', 'ELETRICO', 'EQUIPAMENTOS', 'CASA_DE_MAQUINAS',
      ]);
      if (ehPdf && imagens.length === 0 && DISCIPLINAS_VISAO.has(documentType)) {
        imagens = await this.raster.paginasComoImagens(buffer);
      }

      await this.prisma.documentAnalysis.update({ where: { id: doc.id }, data: { status: 'EXTRAINDO' } });
      const { extracao, erro } = await extractor.extrair(tenantId, texto, imagens);

      await this.prisma.documentAnalysis.update({
        where: { id: doc.id },
        data: {
          status: extracao ? 'EXTRAIDO' : 'FALHA',
          extracao: (extracao ?? {}) as object,
          erro: erro ?? null,
          modeloIa: process.env.OPENAI_MODEL ?? 'gpt-4o',
        },
      });
      base.extracao = extracao;
      base.erro = erro ?? null;
      return base;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Documento ${doc.arquivo.nomeOriginal} falhou: ${msg}`);
      await this.prisma.documentAnalysis.update({ where: { id: doc.id }, data: { status: 'FALHA', erro: msg.slice(0, 500) } });
      base.erro = msg;
      return base;
    }
  }
}
