# ADR-0002 — Multi-tenant por coluna (shared schema)

**Status:** Aceito · **Data:** 2026-06-05

## Contexto
O escopo exige "centenas de usuários simultâneos sem refatoração estrutural" e o produto nasce como SaaS de engenharia comercial. Isolamento entre empresas (tenants) é mandatório — inclusive no índice vetorial (RAG).

## Decisão
**Shared database, shared schema, discriminado por `tenantId`** em (quase) toda tabela.
- `tenantId` (FK → `Tenant`) + `@@index([tenantId])` em todas as entidades de negócio.
- **Middleware Prisma** injeta `where: { tenantId }` automaticamente e bloqueia escrita sem tenant (defesa em profundidade — não confiar só no service).
- `tenantId` vem do JWT (claim) e é propagado por `AsyncLocalStorage` (request context).
- Unicidades são **por tenant**: ex. `@@unique([tenantId, sku])`.
- Busca vetorial (pgvector) sempre filtrada por `tenantId`.

## Consequências
- ✅ Simples de operar/escalar no início; um banco, backup único.
- ✅ Isolamento garantido em camada de dados, não só de aplicação.
- ✅ Caminho para "schema-per-tenant" ou "db-per-tenant" para clientes enterprise, sem mudar o modelo de domínio.
- ⚠️ Risco de "vazamento" se alguém escrever query crua sem filtro → mitigado por middleware + testes de isolamento + revisão.

## Alternativas
- Schema-per-tenant: melhor isolamento, pior operação em escala de muitos tenants pequenos.
- DB-per-tenant: isolamento máximo, custo/operação altos. Reservado a enterprise sob demanda.
