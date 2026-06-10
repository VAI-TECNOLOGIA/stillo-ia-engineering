import { Module } from '@nestjs/common';
import { RuleEngineService } from './rule-engine.service';
import { RuleEngineController } from './rule-engine.controller';
import { ProdutosModule } from '../produtos/produtos.module';

@Module({
  imports: [ProdutosModule],
  controllers: [RuleEngineController],
  providers: [RuleEngineService],
  exports: [RuleEngineService],
})
export class RuleEngineModule {}
