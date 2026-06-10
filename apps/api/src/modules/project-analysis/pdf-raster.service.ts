import { Injectable, Logger } from '@nestjs/common';

/**
 * Rasterização de PDF → PNG (data URLs) para leitura por VISÃO (GPT-4o Vision).
 * Usada quando:
 *  - o PDF não tem texto extraível (escaneado), ou
 *  - a prancha é majoritariamente gráfica (planta CAD com pouco texto vetorial)
 * Plantas são 90% desenho: a visão lê cotas posicionadas, carimbo e geometria
 * que o texto extraído nunca captura.
 */
@Injectable()
export class PdfRasterService {
  private readonly logger = new Logger(PdfRasterService.name);

  /** Máximo de páginas rasterizadas por documento (custo/latência sob controle). */
  static readonly MAX_PAGINAS = 8;

  /**
   * Converte as primeiras N páginas do PDF em PNG data URLs.
   * Retorna [] se a rasterização não estiver disponível no ambiente.
   */
  async paginasComoImagens(buffer: Buffer, maxPaginas = PdfRasterService.MAX_PAGINAS): Promise<string[]> {
    try {
      const { pdfToPng } = await import('pdf-to-png-converter');
      const paginas = await pdfToPng(buffer, {
        viewportScale: 2.0,                                  // ~144dpi — cotas legíveis sem explodir tokens
        pagesToProcess: Array.from({ length: maxPaginas }, (_, i) => i + 1), // acima do total: ignoradas
        disableFontFace: true,
      });
      return paginas
        .filter((p) => p.content)
        .map((p) => `data:image/png;base64,${(p.content as Buffer).toString('base64')}`);
    } catch (e) {
      this.logger.warn(`Rasterização indisponível/falhou: ${String(e)}`);
      return [];
    }
  }

  /** Heurística: prancha gráfica = pouco texto por página (planta CAD típica). */
  static ehPranchaGrafica(paginas: string[]): boolean {
    if (paginas.length === 0) return true;
    const mediaChars = paginas.reduce((s, p) => s + p.trim().length, 0) / paginas.length;
    return mediaChars < 400;
  }
}
