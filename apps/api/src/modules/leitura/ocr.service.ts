import { Injectable, Logger } from '@nestjs/common';
import pdfParse from 'pdf-parse';

export interface OcrResultado {
  texto: string;
  /** Texto separado por página (1-indexado implícito: paginas[0] = pág 1). */
  paginas: string[];
  confianca: number; // 0..1
  metodo: 'pdf-texto' | 'ocr-tesseract' | 'sem-texto' | 'nao-suportado';
}

/**
 * OCR/Parsing com fallback (ver docs/03-IA-OCR-RAG.md):
 *  1) PDF nativo  → extrai texto POR PÁGINA (pdf-parse + pagerender custom).
 *  2) Imagem/escaneado → Tesseract (lazy; baixa traineddata em runtime).
 *  3) PDF sem texto → caller rasteriza e usa visão (PdfRasterService + GPT-4o Vision).
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extract(buffer: Buffer, mimeType: string | null, filename: string): Promise<OcrResultado> {
    const ext = filename.toLowerCase().split('.').pop() ?? '';
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
    const isImage = (mimeType ?? '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff', 'bmp'].includes(ext);

    if (isPdf) {
      const paginas = await this.pdfTextoPorPagina(buffer);
      const texto = this.juntarComMarcadores(paginas);
      if (texto.replace(/\[pág \d+\]/g, '').trim().length >= 40) {
        return { texto, paginas, confianca: 0.95, metodo: 'pdf-texto' };
      }
      // PDF sem texto extraível → escaneado/rasterizado. Caller decide visão.
      return { texto, paginas, confianca: 0.2, metodo: 'sem-texto' };
    }

    if (isImage) {
      return this.tesseract(buffer);
    }

    return { texto: '', paginas: [], confianca: 0, metodo: 'nao-suportado' };
  }

  /** Junta páginas com marcadores [pág N] — os extratores citam a página na evidência. */
  juntarComMarcadores(paginas: string[]): string {
    return paginas.map((p, i) => `[pág ${i + 1}]\n${p.trim()}`).join('\n\n');
  }

  /**
   * Extrai texto página a página. O pagerender custom devolve o texto de CADA
   * página (em vez do blob único padrão) preservando a ordem visual básica.
   */
  private async pdfTextoPorPagina(buffer: Buffer): Promise<string[]> {
    const paginas: string[] = [];
    try {
      await pdfParse(buffer, {
        pagerender: async (pageData: { getTextContent: () => Promise<{ items: { str: string; transform: number[] }[] }> }) => {
          const content = await pageData.getTextContent();
          // agrupa por linha (coordenada Y do transform) p/ não embaralhar cotas
          const linhas = new Map<number, string[]>();
          for (const item of content.items) {
            const y = Math.round(item.transform[5]);
            if (!linhas.has(y)) linhas.set(y, []);
            linhas.get(y)!.push(item.str);
          }
          const texto = [...linhas.entries()]
            .sort((a, b) => b[0] - a[0]) // topo da página primeiro
            .map(([, parts]) => parts.join(' ').trim())
            .filter(Boolean)
            .join('\n');
          paginas.push(texto);
          return texto;
        },
      });
      return paginas;
    } catch (e) {
      this.logger.warn(`Falha ao ler PDF: ${String(e)}`);
      return paginas;
    }
  }

  private async tesseract(buffer: Buffer): Promise<OcrResultado> {
    try {
      // Import dinâmico (dependência opcional). Baixa idioma por+eng em runtime.
      const mod: any = await import('tesseract.js');
      const { data } = await mod.recognize(buffer, 'por+eng');
      const texto = (data.text ?? '').trim();
      return { texto, paginas: [texto], confianca: Math.max(0, Math.min(1, (data.confidence ?? 0) / 100)), metodo: 'ocr-tesseract' };
    } catch (e) {
      this.logger.warn(`OCR Tesseract indisponível/falhou: ${String(e)}`);
      return { texto: '', paginas: [], confianca: 0.1, metodo: 'sem-texto' };
    }
  }
}
