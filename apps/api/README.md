# @stillo/api — Backend (NestJS)

## Rodar localmente

```bash
# 1) Infra (na raiz do monorepo)
pnpm infra:up                      # Postgres (pgvector) + Redis via Docker

# 2) Variáveis
cp .env.example .env               # ajuste se necessário

# 3) Banco
pnpm --filter @stillo/api prisma:generate
pnpm --filter @stillo/api prisma:migrate    # cria as tabelas
pnpm --filter @stillo/api prisma:seed       # tenant + admin + regras + exemplo

# 4) API
pnpm api:dev                       # http://localhost:3333  (docs: /api/docs)
```

Login do seed: **admin@stillo.com / stillo123**

## Testes (motor de regras — domínio puro, sem banco)

```bash
pnpm --filter @stillo/api test
```

## pgvector — índice manual (RAG)

As colunas `embedding vector(1536)` usam pgvector. Após a primeira migration,
crie a extensão e os índices HNSW (o Prisma não gerencia índices em colunas
`Unsupported`). Exemplo de migration SQL a adicionar:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS produto_embedding_hnsw
  ON "Produto" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS catalogo_chunk_embedding_hnsw
  ON "CatalogoChunk" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS base_conhecimento_embedding_hnsw
  ON "BaseConhecimento" USING hnsw (embedding vector_cosine_ops);
```

> `text-embedding-3-large` deve ser chamado com `dimensions: 1536` para casar
> com a definição das colunas e respeitar o limite de índice HNSW.

## O que já está implementado (Fase 0)
- Auth completo: JWT (access) + refresh rotativo com detecção de reuso + RBAC.
- Motor de Regras (domínio puro + service + endpoint de simulação) — **com testes**.
- Health checks, Swagger, validação global, multi-tenant (contexto + guard).

## Próximas fases
Ver [`../../docs/07-ROADMAP.md`](../../docs/07-ROADMAP.md).
