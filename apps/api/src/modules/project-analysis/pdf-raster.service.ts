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
   * Teto de bytes do PNG por página. Pranchas A0/A1 a escala 2.0 passam de 16MB
   * e ESTOURAM o limite de imagem dos providers (Anthropic = 10MB; e os modelos
   * reduzem internamente imagens grandes — acima disso é só latência sem ganho).
   * Acima do teto, a página é re-renderizada com escala proporcionalmente menor.
   */
  static readonly MAX_BYTES_PAGINA = 5 * 1024 * 1024;

  /**
   * Converte as primeiras N páginas do PDF em PNG data URLs.
   * Retorna [] se a rasterização não estiver disponível no ambiente.
   */
  async paginasComoImagens(buffer: Buffer, maxPaginas = PdfRasterService.MAX_PAGINAS): Promise<string[]> {
    try {
      const { pdfToPng } = await import('pdf-to-png-converter');
      const render = (paginas: number[], escala: number) =>
        pdfToPng(buffer, { viewportScale: escala, pagesToProcess: paginas, disableFontFace: true });

      const paginas = await render(Array.from({ length: maxPaginas }, (_, i) => i + 1), 2.0);
      const LIMITE = PdfRasterService.MAX_BYTES_PAGINA;
      const out: string[] = [];

      for (const [idx, p] of paginas.entries()) {
        let png = p.content as Buffer | undefined;
        if (!png) continue;
        if (png.length > LIMITE) {
          // bytes de PNG ~ área ∝ escala² → nova escala = 2.0·√(teto/bytes), com folga de 10%
          const escala = Math.max(1.0, 2.0 * Math.sqrt((LIMITE * 0.9) / png.length));
          this.logger.log(`Página ${idx + 1}: PNG ${(png.length / 1e6).toFixed(1)}MB > teto — re-render a escala ${escala.toFixed(2)}`);
          const [menor] = await render([idx + 1], escala);
          if (menor?.content) png = menor.content as Buffer;
        }
        out.push(`data:image/png;base64,${png.toString('base64')}`);
      }
      return out;
    } catch (e) {
      this.logger.warn(`Rasterização indisponível/falhou: ${String(e)}`);
      return [];
    }
  }

  /**
   * Diagnóstico de capacidade de rasterização (smoke-test). Diferente de
   * paginasComoImagens, SURFACE o erro real (não engole) — usado pelo endpoint
   * /diag/raster para confirmar @napi-rs/canvas em produção (Vercel).
   */
  async diagnostico(buffer: Buffer): Promise<{ ok: boolean; paginas: number; bytesPrimeira: number; erro?: string }> {
    try {
      const { pdfToPng } = await import('pdf-to-png-converter');
      const pages = await pdfToPng(buffer, { viewportScale: 2.0, pagesToProcess: [1], disableFontFace: true });
      const comConteudo = pages.filter((p) => p.content);
      return { ok: comConteudo.length > 0, paginas: comConteudo.length, bytesPrimeira: (comConteudo[0]?.content as Buffer | undefined)?.length ?? 0 };
    } catch (e) {
      return { ok: false, paginas: 0, bytesPrimeira: 0, erro: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
    }
  }

  /** Heurística: prancha gráfica = pouco texto por página (planta CAD típica). */
  static ehPranchaGrafica(paginas: string[]): boolean {
    if (paginas.length === 0) return true;
    const mediaChars = paginas.reduce((s, p) => s + p.trim().length, 0) / paginas.length;
    return mediaChars < 400;
  }
}
