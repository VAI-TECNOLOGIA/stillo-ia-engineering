import { Module } from '@nestjs/common';
import { AprendizadoService } from './aprendizado.service';
import { AprendizadoController } from './aprendizado.controller';

@Module({
  controllers: [AprendizadoController],
  providers: [AprendizadoService],
  exports: [AprendizadoService],
})
export class AprendizadoModule {}
