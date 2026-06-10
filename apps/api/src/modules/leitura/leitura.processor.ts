import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../common/storage/storage.types';
import { OcrService } from './ocr.service';
import { LeituraExtractor } from './leitura.extractor';

/**
 * Pipeline de uma Leitura: OCR do arquivo → extração estruturada por IA →
 * persiste resultado. Chamado pela fila (BullMQ) ou inline (dev).
 */
@Injectable()
export class LeituraProcessor {
  private readonly logger = new Logger(LeituraProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: OcrService,
    private readonly extractor: LeituraExtractor,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async process(leituraId: string): Promise<void> {
    const leitura = await this.prisma.leitura.findUnique({ where: { id: leituraId }, include: { arquivo: true } });
    if (!leitura) return;

    await this.prisma.leitura.update({ where: { id: leituraId }, data: { status: 'PROCESSANDO' } });

    try {
      let texto = '';
      let ocrConf = 1;

      if (leitura.arquivo) {
        const buffer = await this.storage.get(leitura.arquivo.storageKey);
        const ocr = await this.ocr.extract(buffer, leitura.arquivo.mimeType, leitura.arquivo.nomeOriginal);
        texto = ocr.texto;
        ocrConf = ocr.confianca;
        await this.prisma.arquivo.update({
          where: { id: leitura.arquivo.id },
          data: {
            textoExtraido: texto.slice(0, 100_000),
            ocrConfianca: ocrConf,
            statusProcessamento: ocrConf < 0.5 ? 'REVISAO_MANUAL' : 'CONCLUIDO',
          },
        });
      }

      const resultado = await this.extractor.extrair(leitura.tenantId, texto);
      const baixaConfianca =
        ocrConf < 0.6 || resultado.piscinas.length === 0 || resultado.piscinas.some((p) => p.confianca < 0.6);

      await this.prisma.leitura.update({
        where: { id: leituraId },
        data: {
          status: baixaConfianca ? 'REVISAO_MANUAL' : 'CONCLUIDO',
          textoOcr: texto.slice(0, 100_000),
          ocrConfianca: ocrConf,
          resultado: resultado as object,
          modeloIa: process.env.OPENAI_MODEL ?? 'gpt-4o',
        },
      });
    } catch (e) {
      this.logger.error(`Leitura ${leituraId} falhou: ${String(e)}`);
      await this.prisma.leitura.update({
        where: { id: leituraId },
        data: { status: 'FALHA', erro: e instanceof Error ? e.message : String(e) },
      });
    }
  }
}
