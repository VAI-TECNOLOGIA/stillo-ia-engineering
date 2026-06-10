import { Module } from '@nestjs/common';
import { IaChatService } from './ia-chat.service';
import { IaChatController } from './ia-chat.controller';
import { ProdutosModule } from '../produtos/produtos.module';

@Module({
  imports: [ProdutosModule], // ProdutoSearchService para o RAG
  controllers: [IaChatController],
  providers: [IaChatService],
})
export class IaChatModule {}
