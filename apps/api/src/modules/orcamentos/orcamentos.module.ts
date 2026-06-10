import { Module } from '@nestjs/common';
import { ProjectAnalysisModule } from '../project-analysis/project-analysis.module';
import { OrcamentosService } from './orcamentos.service';
import { OrcamentoExportService } from './orcamento-export.service';
import { OrcamentosController } from './orcamentos.controller';

@Module({
  imports: [ProjectAnalysisModule], // trava de orçamento (ETAPA 9)
  controllers: [OrcamentosController],
  providers: [OrcamentosService, OrcamentoExportService],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}
