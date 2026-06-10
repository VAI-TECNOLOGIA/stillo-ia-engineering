import { Module } from '@nestjs/common';
import { ConfigIntegracoesService } from './config-integracoes.service';
import { ConfigIntegracoesController } from './config-integracoes.controller';

@Module({
  controllers: [ConfigIntegracoesController],
  providers: [ConfigIntegracoesService],
})
export class ConfigIntegracoesModule {}
