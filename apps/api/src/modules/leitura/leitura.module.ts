import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { LeituraExtractor } from './leitura.extractor';
import { LeituraProcessor } from './leitura.processor';
import { LeituraQueue } from './leitura.queue';
import { LeituraService } from './leitura.service';
import { LeituraController } from './leitura.controller';

@Module({
  controllers: [LeituraController],
  providers: [OcrService, LeituraExtractor, LeituraProcessor, LeituraQueue, LeituraService],
  exports: [LeituraService, OcrService],
})
export class LeituraModule {}
