import { Module } from '@nestjs/common';
import { ArquivosService } from './arquivos.service';
import { ArquivosController } from './arquivos.controller';

@Module({
  controllers: [ArquivosController],
  providers: [ArquivosService],
  exports: [ArquivosService],
})
export class ArquivosModule {}
