import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type Produto } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/**
 * Busca de produtos para o RAG/seleção. Híbrida:
 *  - LEXICAL (sempre): casa SKU/nome/fabricante/modelo — termos exatos.
 *  - VETORIAL (quando há embeddings + IA): similaridade semântica (pgvector).
 * Sem IA configurada, a busca lexical sozinha mantém o sistema útil.
 */
@Injectable()
export class ProdutoSearchService {
  private readonly logger = new Logger(ProdutoSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async buscar(tenantId: string, query: string, categoria?: string, k = 8): Promise<Produto[]> {
    const q = (query ?? '').trim();

    const lexicais = await this.prisma.produto.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: 'ATIVO',
        ...(categoria ? { categoria } : {}),
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
                { sku: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
                { fabricante: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
                { modelo: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
              ],
            }
          : {}),
      },
      orderBy: { preco: 'asc' },
      take: k,
    });

    const vetoriais = q ? await this.buscarVetorial(tenantId, q, categoria, k) : [];

    // Mescla: semânticos primeiro, lexicais completam; dedup por id.
    const mapa = new Map<string, Produto>();
    for (const p of [...vetoriais, ...lexicais]) if (!mapa.has(p.id)) mapa.set(p.id, p);
    return [...mapa.values()].slice(0, k);
  }

  /** Seleciona o melhor produto para um item de dimensionamento (best-effort). */
  async selecionarParaItem(tenantId: string, categoria: string, descricao: string): Promise<Produto | null> {
    const [melhor] = await this.buscar(tenantId, descricao, categoria, 1);
    if (melhor) return melhor;
    return this.prisma.produto.findFirst({
      where: { tenantId, deletedAt: null, status: 'ATIVO', categoria },
      orderBy: { preco: 'asc' },
    });
  }

  private async buscarVetorial(tenantId: string, q: string, categoria: string | undefined, k: number): Promise<Produto[]> {
    try {
      const [emb] = await this.ai.embed(tenantId, [q]);
      if (!emb?.length) return [];
      const literal = `[${emb.join(',')}]`;
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Produto"
        WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL AND embedding IS NOT NULL
        ${categoria ? Prisma.sql`AND categoria = ${categoria}` : Prisma.empty}
        ORDER BY embedding <=> ${literal}::vector
        LIMIT ${k}`;
      const ids = rows.map((r) => r.id);
      if (!ids.length) return [];
      const found = await this.prisma.produto.findMany({ where: { id: { in: ids } } });
      return ids.map((id) => found.find((f) => f.id === id)).filter((p): p is Produto => !!p);
    } catch (e) {
      this.logger.debug(`Busca vetorial indisponível: ${String(e)}`);
      return [];
    }
  }
}
