import { Module } from '@nestjs/common';
import { LeituraModule } from '../leitura/leitura.module';
import { DocumentClassifierService } from './document-classifier.service';
import { ArchitecturalExtractor } from './extractors/architectural.extractor';
import { HydraulicExtractor } from './extractors/hydraulic.extractor';
import { ElectricalExtractor } from './extractors/electrical.extractor';
import { DetailExtractor } from './extractors/detail.extractor';
import { EquipmentExtractor } from './extractors/equipment.extractor';
import { StructuralExtractor } from './extractors/structural.extractor';
import { MemorialExtractor } from './extractors/memorial.extractor';
import { ExtractorRegistry } from './extractors/extractor.registry';
import { PdfRasterService } from './pdf-raster.service';
import { ProjectConsolidatorService } from './project-consolidator.service';
import { ProjectValidationService } from './project-validation.service';
import { ProjectAnalysisProcessor } from './project-analysis.processor';
import { ProjectAnalysisQueue } from './project-analysis.queue';
import { ProjectAnalysisService } from './project-analysis.service';
import { ProjectAnalysisController } from './project-analysis.controller';

/**
 * Motor de leitura v2 — classificação por disciplina, extração especializada,
 * consolidação com evidências, validação técnica, confirmação humana e
 * trava de orçamento. (LeituraModule legado permanece para retrocompatibilidade.)
 */
@Module({
  imports: [LeituraModule], // reusa OcrService
  controllers: [ProjectAnalysisController],
  providers: [
    DocumentClassifierService,
    ArchitecturalExtractor,
    HydraulicExtractor,
    ElectricalExtractor,
    DetailExtractor,
    EquipmentExtractor,
    StructuralExtractor,
    MemorialExtractor,
    ExtractorRegistry,
    PdfRasterService,
    ProjectConsolidatorService,
    ProjectValidationService,
    ProjectAnalysisProcessor,
    ProjectAnalysisQueue,
    ProjectAnalysisService,
  ],
  exports: [ProjectAnalysisService],
})
export class ProjectAnalysisModule {}
