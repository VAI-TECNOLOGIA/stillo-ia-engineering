import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/**
 * Indexa produtos para busca semântica (RAG): gera o embedding do texto
 * comercial+técnico e grava na coluna pgvector via SQL (Prisma não escreve
 * tipos Unsupported diretamente). Best-effort: se a IA não estiver configurada,
 * apenas registra e segue — a busca lexical continua funcionando.
 */
@Injectable()
export class ProdutoIndexer {
  private readonly logger = new Logger(ProdutoIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /** Texto canônico do produto para embedding. */
  static textoDe(p: { nome: string; categoria: string; fabricante?: string | null; modelo?: string | null; especificacoes?: unknown }): string {
    const specs = p.especificacoes && typeof p.especificacoes === 'object' ? JSON.stringify(p.especificacoes) : '';
    return [p.nome, p.categoria, p.fabricante, p.modelo, specs].filter(Boolean).join(' · ');
  }

  async indexar(tenantId: string, produtoId: string): Promise<void> {
    try {
      const produto = await this.prisma.produto.findFirst({ where: { id: produtoId, tenantId } });
      if (!produto) return;
      const [embedding] = await this.ai.embed(tenantId, [ProdutoIndexer.textoDe(produto)]);
      if (!embedding?.length) return;
      const literal = `[${embedding.join(',')}]`;
      await this.prisma.$executeRaw`UPDATE "Produto" SET embedding = ${literal}::vector WHERE id = ${produtoId}`;
    } catch (e) {
      // Sem chave OpenAI ou pgvector ausente → degrada para busca lexical.
      this.logger.debug(`Embedding do produto ${produtoId} não gerado: ${String(e)}`);
    }
  }
}
