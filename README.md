# STILLO IA ENGINEERING

> Plataforma de **engenharia comercial** que transforma projetos de piscina (PDF, planta, dados) em **orçamentos técnicos completos** via IA + motor de regras + catálogos + banco de produtos. **Human-in-the-loop**, multi-tenant, pronta para escala.

[![status](https://img.shields.io/badge/fase-0%20fundação-blue)]() [![api](https://img.shields.io/badge/API-NestJS-red)]() [![web](https://img.shields.io/badge/Web-React%2BVite-0ea5e9)]() [![db](https://img.shields.io/badge/DB-Postgres%2Bpgvector-336791)]()

## ✨ O que é

Hoje, transformar um projeto de piscina em orçamento é manual e depende de um especialista escasso. A STILLO automatiza a cadeia **Leitura → Dimensionamento → Seleção de produtos → Orçamento**, mantendo o humano no comando (revisão/aprovação) e **aprendendo** com cada correção.

## 🏗️ Arquitetura (resumo)

```
apps/
  api/   → NestJS + Prisma + Postgres(pgvector) + Redis/BullMQ   (REST /api/v1)
  web/   → React + Vite + Tailwind + shadcn + TanStack + Zustand (SPA premium)
docs/    → arquitetura, modelo de dados, IA/OCR/RAG, motor de regras, API, UX, roadmap
```

- **Multi-tenant** desde o dia 1 (ADR-0002).
- **Provider de IA/OCR/Storage abstraído** — OpenAI default, troca por config (ADR-0003).
- **Dimensionamento determinístico** (motor de regras), IA como copiloto (RAG com citação obrigatória).
- **Tudo assíncrono e auditável** (filas + audit log).

> Documentação completa em [`docs/`](docs/). Comece por [`docs/00-VISAO-GERAL.md`](docs/00-VISAO-GERAL.md).

## 🚀 Subir o projeto

```bash
# pré-requisitos: Node 20+, pnpm 9+, Docker

pnpm install
pnpm infra:up                                   # Postgres(pgvector) + Redis

cp apps/api/.env.example apps/api/.env
pnpm --filter @stillo/api prisma:generate
pnpm --filter @stillo/api prisma:migrate        # cria tabelas
pnpm --filter @stillo/api prisma:seed           # admin@stillo.com / stillo123

pnpm dev                                        # API :3333 + Web :5173
```

- Web: http://localhost:5173 · API docs (Swagger): http://localhost:3333/api/docs

## ✅ O que já está pronto (Fases 0 a 7 — roadmap completo, 18/18 entregáveis)

| Área | Entregue |
|------|----------|
| **Modelo de dados** | 26 entidades Prisma multi-tenant (clientes→obras→piscinas→leitura→dimensionamento→orçamento, regras, catálogos/produtos, RAG, aprendizado, auditoria) |
| **Auth** | JWT + refresh rotativo (detecção de reuso) + **RBAC** (6 perfis, matriz de permissões) |
| **Motor de Regras** ⭐ | Domínio puro testado (FactBuilder + condições + **expressões seguras sem eval** + engine) + **editor visual CRUD com versionamento e simulação** (Fase 3) |
| **Comercial & Obras** (Fase 1) | CRUD de **Clientes** e **Obras** (tenant-scoped, paginação por cursor, busca, soft-delete, auditoria) + **upload de arquivos** (storage abstraído: Local/Supabase) |
| **Leitura Inteligente** (Fase 2) | Pipeline **OCR (pdf-parse + Tesseract) → extração por IA → Zod**, fila BullMQ (modo inline em dev), revisão humana com confiança, aplicar→cria piscinas |
| **IA / OpenAI** (Fase 2) | Provider OpenAI abstraído; **chave vinculável por tenant na tela de Configurações**, criptografada (AES-256-GCM); fallback por env |
| **Dimensionamento** (Fase 3) | Botão **GERAR DIMENSIONAMENTO**: piscinas → motor → necessidades técnicas por categoria, **com origem/explicação + SKU sugerido** |
| **Produtos & Catálogos** (Fase 4) | CRUD de Produtos (SKU, specs, substitutos) + **ingestão de catálogos** (PDF/CSV → chunks → embeddings pgvector) |
| **RAG & IA Técnica** (Fase 4) | **Busca híbrida** (lexical + vetorial) liga necessidade→SKU real; **chat técnico** que responde citando SKU (nunca inventa produto) |
| **Orçamento & Exportação** (Fase 5) | Monta orçamento do dimensionamento; **revisão técnica** (editar/trocar/remover/adicionar com justificativa→aprendizado), **versões**, aprovação, **exportar PDF/Word/Excel/Texto** |
| **Aprendizado** (Fase 6) | Consolida correções em **estatísticas** + **padrões recorrentes** (sugestões) + **base de conhecimento indexada** (RAG) — o sistema melhora com o uso |
| **Dashboards & Hardening** (Fase 7) | **Dashboard operacional** (KPIs reais + ranking) e **executivo** (tendência, equipamentos, fabricantes, cidades); **rate limiting** (throttler, IA mais restrita); **404/erro** amigável |
| **API** | NestJS com Swagger, validação global, health checks, **39 testes passando** |
| **Web** | SPA premium (17 telas): login, dashboards, Clientes, Obras, Leitura, **Regras**, Dimensionamento, Produtos, Catálogos, **Orçamento**, **Aprendizado**, **Executivo**, Configurações, **chat IA com RAG** |
| **Infra** | docker-compose (Postgres+pgvector, Redis), monorepo pnpm, builds verdes |

## 🗺️ Roadmap

Fases 0–7 ✅ **concluídas**: fundação · comercial/obras · leitura (OCR+IA) · motor+dimensionamento · catálogos/produtos/RAG · orçamento/revisão/exportação · chat IA + aprendizado · dashboards + hardening.

Detalhe em [`docs/07-ROADMAP.md`](docs/07-ROADMAP.md).

## 🧪 Testes

```bash
pnpm --filter @stillo/api test     # motor de regras (domínio puro)
```

## 📂 Documentação

| Doc | Conteúdo |
|-----|----------|
| [00-VISAO-GERAL](docs/00-VISAO-GERAL.md) | Negócio, gargalos, riscos, personas |
| [01-ARQUITETURA](docs/01-ARQUITETURA.md) | C4, módulos, fluxograma, escalabilidade, deploy |
| [02-MODELO-DE-DADOS](docs/02-MODELO-DE-DADOS.md) | ER + entidades |
| [03-IA-OCR-RAG](docs/03-IA-OCR-RAG.md) | Estratégias de IA, OCR e RAG |
| [04-MOTOR-DE-REGRAS](docs/04-MOTOR-DE-REGRAS.md) | O coração: regras editáveis sem código |
| [05-API-E-PERMISSOES](docs/05-API-E-PERMISSOES.md) | Endpoints + matriz RBAC |
| [06-UX-WIREFRAMES](docs/06-UX-WIREFRAMES.md) | UX e wireframes de todas as telas |
| [07-ROADMAP](docs/07-ROADMAP.md) | Plano de desenvolvimento + casos de uso |
| [adr/](docs/adr/) | Decisões de arquitetura |
