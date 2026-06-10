import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Query padrão de listagem: paginação por cursor + busca textual opcional. */
export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  q?: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Aplica paginação por cursor a uma lista buscada com `take: limit + 1`.
 * Retorna os itens e o cursor da próxima página (ou null no fim).
 */
export function buildPage<T extends { id: string }>(rows: T[], limit: number): Paginated<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}
