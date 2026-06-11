import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PdfRasterService } from '../../modules/project-analysis/pdf-raster.service';
import { OcrService } from '../../modules/leitura/ocr.service';

/**
 * Diagnóstico de produção (público, sem auth/DB/chave).
 * /diag/raster exercita a rasterização (pdf-to-png-converter + @napi-rs/canvas)
 * e a extração de texto (pdf-parse) num PDF mínimo embutido — responde se a
 * leitura de PDF funciona no ambiente serverless da Vercel.
 */

// PDF mínimo de 1 página (renderiza no pdfjs/pdf-to-png-converter).
const PDF_TESTE =
  '%PDF-1.4\n' +
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n' +
  '4 0 obj<</Length 44>>stream\n' +
  'BT /F1 24 Tf 100 700 Td (PISCINA 41,40m2) Tj ET\n' +
  'endstream\nendobj\n' +
  'xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n0000000179 00000 n \n' +
  'trailer<</Size 5/Root 1 0 R>>\nstartxref\n270\n%%EOF';

@ApiTags('diag')
@Controller('diag')
export class DiagController {
  constructor(
    private readonly raster: PdfRasterService,
    private readonly ocr: OcrService,
  ) {}

  @Get('raster')
  async diagRaster() {
    const pdf = Buffer.from(PDF_TESTE, 'latin1');

    // 1. Rasterização (o caminho de risco na Vercel — binário nativo)
    const t0 = Date.now();
    const raster = await this.raster.diagnostico(pdf);
    const msRaster = Date.now() - t0;

    // 2. Extração de texto (pdf-parse — fallback quando a visão não está disponível)
    let texto = { ok: false, chars: 0, metodo: 'erro', erro: undefined as string | undefined };
    try {
      const r = await this.ocr.extract(pdf, 'application/pdf', 'diag.pdf');
      texto = { ok: r.texto.trim().length > 0, chars: r.texto.trim().length, metodo: r.metodo, erro: undefined };
    } catch (e) {
      texto.erro = e instanceof Error ? e.message : String(e);
    }

    const visaoDisponivel = raster.ok;
    return {
      status: visaoDisponivel ? 'VISAO_OK' : texto.ok ? 'SOMENTE_TEXTO_FALLBACK' : 'FALHA_TOTAL',
      rasterizacao: { ...raster, ms: msRaster },
      textoPdfParse: texto,
      veredito: visaoDisponivel
        ? 'Rasterização + visão funcionam na Vercel — plantas escaneadas/gráficas serão lidas como imagem.'
        : texto.ok
          ? 'Rasterização indisponível (provável @napi-rs/canvas ausente). Fallback de TEXTO ativo: PDFs nativos são lidos, mas plantas gráficas/escaneadas perdem cobertura.'
          : 'Nem rasterização nem texto funcionaram — investigar dependências.',
      ambiente: { node: process.version, vercel: !!process.env.VERCEL, region: process.env.VERCEL_REGION ?? 'local' },
    };
  }

  /**
   * Reporta quais IAs estão configuradas por ENV (sem expor chaves) e se o
   * CONSENSO entre IAs está ativo. ≥2 IAs → cada upload é lido por todas e os
   * campos críticos precisam concordar; <2 → leitura única (sem corroboração).
   */
  @Get('ai')
  diagAi() {
    const providers = [
      { provider: 'openai',    env: 'OPENAI_API_KEY',    ativo: !!process.env.OPENAI_API_KEY },
      { provider: 'anthropic', env: 'ANTHROPIC_API_KEY', ativo: !!process.env.ANTHROPIC_API_KEY },
      { provider: 'gemini',    env: 'GEMINI_API_KEY',    ativo: !!process.env.GEMINI_API_KEY },
    ];
    const ativos = providers.filter((p) => p.ativo).map((p) => p.provider);
    const consensoAtivo = ativos.length >= 2;
    return {
      consensoAtivo,
      modo: consensoAtivo
        ? `consenso entre ${ativos.length} IAs`
        : ativos.length === 1 ? `1 IA (${ativos[0]}) — sem corroboração` : 'nenhuma IA configurada',
      ativos,
      providers,
      veredito: consensoAtivo
        ? `Consenso ${ativos.join(' + ')} ATIVO: cada upload é lido pelas ${ativos.length} IAs de forma independente; ` +
          `os campos críticos precisam concordar — divergência/ilegível vira pendência e trava o orçamento.`
        : 'Consenso inativo — configure ao menos 2 chaves (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY).',
    };
  }
}
