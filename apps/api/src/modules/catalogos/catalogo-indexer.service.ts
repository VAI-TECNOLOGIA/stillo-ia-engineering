import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { OcrService } from '../leitura/ocr.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../common/storage/storage.types';

/**
 * Indexa um catálogo: extrai texto → fragmenta (chunks) → gera embeddings →
 * grava em pgvector. Roda inline (best-effort). Sem IA, fica sem embedding e a
 * busca lexical de produtos continua atendendo.
 */
@Injectable()
export class CatalogoIndexer {
  private readonly logger = new Logger(CatalogoIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly ocr: OcrService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async process(catalogoId: string): Promise<void> {
    const cat = await this.prisma.catalogo.findUnique({ where: { id: catalogoId } });
    if (!cat?.storageKey) return;
    await this.prisma.catalogo.update({ where: { id: catalogoId }, data: { statusIndexacao: 'INDEXANDO' } });

    try {
      const buffer = await this.storage.get(cat.storageKey);
      const texto = await this.extrair(cat.fonte, cat.nome, buffer);
      const pedacos = chunkText(texto, 800);

      const chunks: { id: string; texto: string }[] = [];
      let ordem = 0;
      for (const t of pedacos) {
        const c = await this.prisma.catalogoChunk.create({
          data: { tenantId: cat.tenantId, catalogoId, ordem: ordem++, texto: t },
        });
        chunks.push({ id: c.id, texto: t });
      }
      await this.embedChunks(cat.tenantId, chunks);

      await this.prisma.catalogo.update({
        where: { id: catalogoId },
        data: { statusIndexacao: 'INDEXADO', totalChunks: chunks.length, erro: null },
      });
    } catch (e) {
      this.logger.warn(`Indexação do catálogo ${catalogoId} falhou: ${String(e)}`);
      await this.prisma.catalogo.update({
        where: { id: catalogoId },
        data: { statusIndexacao: 'FALHA', erro: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  private async extrair(fonte: string, nome: string, buffer: Buffer): Promise<string> {
    if (fonte === 'PDF') return (await this.ocr.extract(buffer, 'application/pdf', nome)).texto;
    if (fonte === 'CSV' || fonte === 'TXT') return buffer.toString('utf8');
    throw new Error(`Formato "${fonte}" ainda não suportado na indexação (use PDF, CSV ou TXT).`);
  }

  private async embedChunks(tenantId: string, chunks: { id: string; texto: string }[]): Promise<void> {
    if (!chunks.length) return;
    try {
      const embeddings = await this.ai.embed(tenantId, chunks.map((c) => c.texto));
      for (let i = 0; i < chunks.length; i++) {
        const emb = embeddings[i];
        if (!emb?.length) continue;
        const literal = `[${emb.join(',')}]`;
        await this.prisma.$executeRaw`UPDATE "CatalogoChunk" SET embedding = ${literal}::vector WHERE id = ${chunks[i].id}`;
      }
    } catch (e) {
      this.logger.debug(`Embeddings do catálogo não gerados: ${String(e)}`);
    }
  }
}

/** Fragmenta texto em pedaços ~maxChars, respeitando quebras de parágrafo. */
export function chunkText(texto: string, maxChars: number): string[] {
  const limpo = (texto ?? '').replace(/\r/g, '').trim();
  if (!limpo) return [];
  const paragrafos = limpo.split(/\n{2,}/);
  const chunks: string[] = [];
  let atual = '';
  for (const p of paragrafos) {
    if ((atual + '\n\n' + p).length > maxChars && atual) {
      chunks.push(atual.trim());
      atual = p;
    } else {
      atual = atual ? `${atual}\n\n${p}` : p;
    }
  }
  if (atual.trim()) chunks.push(atual.trim());
  return chunks;
}

export function mapFonte(ext: string): string {
  const e = ext.toLowerCase().replace('.', '');
  if (e === 'pdf') return 'PDF';
  if (e === 'csv') return 'CSV';
  if (['xls', 'xlsx'].includes(e)) return 'EXCEL';
  if (['doc', 'docx'].includes(e)) return 'DOC';
  return 'TXT';
}
