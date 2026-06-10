import { Module } from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { ProdutosController } from './produtos.controller';
import { ProdutoIndexer } from './produto-indexer.service';
import { ProdutoSearchService } from './produto-search.service';

@Module({
  controllers: [ProdutosController],
  providers: [ProdutosService, ProdutoIndexer, ProdutoSearchService],
  exports: [ProdutosService, ProdutoSearchService],
})
export class ProdutosModule {}
