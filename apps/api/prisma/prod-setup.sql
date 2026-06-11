-- ─────────────────────────────────────────────────────────────────────────────
-- STILLO — Setup de produção (rodar UMA vez, com a connection string DIRETA/unpooled).
-- Os índices HNSW são em colunas `vector` (Unsupported no Prisma) → SQL manual.
-- Ordem: (1) este arquivo precisa da extensão vector e das tabelas já criadas
--        → rode DEPOIS de `prisma db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensão pgvector (db push já cria via postgresqlExtensions, mas garantimos):
CREATE EXTENSION IF NOT EXISTS vector;

-- Índices HNSW (busca vetorial do RAG por similaridade de cosseno):
CREATE INDEX IF NOT EXISTS produto_embedding_hnsw
  ON "Produto" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS catalogo_chunk_embedding_hnsw
  ON "CatalogoChunk" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS base_conhecimento_embedding_hnsw
  ON "BaseConhecimento" USING hnsw (embedding vector_cosine_ops);
