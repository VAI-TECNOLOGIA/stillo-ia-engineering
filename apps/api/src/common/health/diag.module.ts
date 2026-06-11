import { Module } from '@nestjs/common';
import { LeituraModule } from '../../modules/leitura/leitura.module';
import { PdfRasterService } from '../../modules/project-analysis/pdf-raster.service';
import { DiagController } from './diag.controller';

/**
 * Módulo de diagnóstico de produção. Reusa OcrService (LeituraModule) e provê
 * PdfRasterService isolado (sem deps) — endpoint público, sem auth/DB/chave.
 */
@Module({
  imports: [LeituraModule],
  controllers: [DiagController],
  providers: [PdfRasterService],
})
export class DiagModule {}
