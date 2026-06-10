import { Module } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';
import { CatalogoIndexer } from './catalogo-indexer.service';
import { LeituraModule } from '../leitura/leitura.module';

@Module({
  imports: [LeituraModule], // reusa OcrService para extrair texto de PDF
  controllers: [CatalogosController],
  providers: [CatalogosService, CatalogoIndexer],
  exports: [CatalogosService],
})
export class CatalogosModule {}
