# 07 — Roadmap & Plano de Desenvolvimento

Estratégia: **fatias verticais** que entregam valor de ponta a ponta, na ordem em que destravam o fluxo principal. A arquitetura já nasce completa (multi-tenant, filas, RBAC); cada fase **liga** mais um pedaço.

## Fase 0 — Fundação (semana 1–2)  ✅ iniciada neste scaffold
- Monorepo, Docker (Postgres+pgvector, Redis), CI lint/test.
- Prisma schema completo + migrations + seed.
- Auth (JWT + refresh + RBAC) ponta a ponta.
- Shell do front (layout, sidebar, rotas protegidas, login).
- **Entrega:** login funcional + usuário vê dashboard vazio.

## Fase 1 — Comercial & Obras (semana 3–4)  ✅ concluída
- CRUD Clientes, Obras, upload de arquivos (Storage abstraído Local/Supabase).
- Auditoria + listagens paginadas por cursor + soft-delete.
- **Entrega:** cadastrar cliente → obra → anexar PDF. ✔

## Fase 2 — Leitura Inteligente (semana 5–7)  ✅ concluída
- Pipeline OCR (pdf-parse nativo + Tesseract) → worker/fila BullMQ (modo inline em dev).
- Extração estruturada via IA (OpenAI abstraído) + validação Zod + confiança por campo.
- Tela de revisão da leitura (destaque de baixa confiança, edição manual) + aplicar→piscinas.
- **Integração OpenAI vinculável por tenant** (Configurações), chave criptografada (AES-256-GCM).
- **Entrega:** PDF → piscinas/dimensões/sistemas conferíveis. ✔

## Fase 3 — Motor de Regras + Dimensionamento (semana 8–10)  ⭐ coração — ✅ concluída
- Avaliador de regras + FactBuilder + expressões seguras (testado).
- **CRUD de regras com editor visual** (QUANDO/ENTÃO sem código) + simulação/dry-run + **versionamento** (RegraVersao).
- Botão **"GERAR DIMENSIONAMENTO"** + tela com necessidades por categoria e origem rastreável.
- **Entrega:** piscina → lista de necessidades técnicas explicável. ✔

## Fase 4 — Catálogos, Produtos & RAG (semana 11–13)  ✅ concluída
- Ingestão de catálogos (PDF/CSV/TXT) → chunks → embeddings (pgvector); Excel/DOC = adapters futuros.
- CRUD Produtos + compatibilidades/substitutos + indexação automática (embedding).
- Busca **híbrida** (vetorial + lexical) + **chat IA técnico** com citação de SKU.
- **Entrega:** dimensionamento → SKUs reais sugeridos. ✔

## Fase 5 — Orçamento + Revisão + Exportação (semana 14–16)  ✅ concluída
- Montagem automática do orçamento a partir do dimensionamento (herda SKU + preço).
- Revisão técnica (editar/trocar/remover/adicionar + justificativa → `Correcao` p/ aprendizado).
- Versões (snapshot `OrcamentoVersao`) + comparação + aprovação.
- Exportação PDF (print-to-PDF do HTML), Word (.doc), Excel (CSV), Texto (copiar).
- **Entrega:** fluxo completo upload → proposta. ✔

## Fase 6 — IA Técnica (chat) + Aprendizado (semana 17–19)  ✅ concluída
- Chat lateral RAG com citações (entregue na Fase 4).
- Loop de aprendizado: correções → **estatísticas** + **padrões recorrentes** + **base de conhecimento** indexada (embeddings).
- **Entrega:** sistema melhora com o uso. ✔

## Fase 7 — Dashboards & Hardening (semana 20–22)  ✅ concluída
- Dashboard operacional (KPIs reais + ranking) + executivo (tendência/equipamentos/fabricantes/cidades, Recharts).
- Rate limiting (throttler global + IA restrita), página de erro/404 amigável.
- Restam para produção em escala: observabilidade (métricas/tracing), testes de carga, backups, índice HNSW aplicado.
- **Entrega:** os 18 entregáveis do brief cobertos. ✔

---

> **Roadmap concluído (Fases 0–7).** Próximos passos sugeridos para produção real:
> aplicar migrations + índice HNSW no Postgres, deploy (Dokploy/K8s), observabilidade e testes de carga.

---

## Casos de uso (resumo)

| ID | Ator | Caso de uso | Fase |
|----|------|-------------|------|
| UC-01 | Comercial | Cadastrar cliente e obra, anexar projeto | 1 |
| UC-02 | Orçamentista | Ler projeto via IA e corrigir extração | 2 |
| UC-03 | Orçamentista | Gerar dimensionamento de uma piscina | 3 |
| UC-04 | Admin | Criar/editar/simular regra sem programar | 3 |
| UC-05 | Admin | Subir catálogo e indexar produtos | 4 |
| UC-06 | Orçamentista | Perguntar à IA qual produto usar | 4/6 |
| UC-07 | Orçamentista | Montar e revisar orçamento (com justificativa) | 5 |
| UC-08 | Gerente | Aprovar orçamento e comparar versões | 5 |
| UC-09 | Comercial | Exportar proposta (PDF/Word/Excel) | 5 |
| UC-10 | Diretoria | Acompanhar KPIs e margem | 7 |

## Definição de pronto (DoD) por fatia
- Testes (unit + e2e do caminho feliz) verdes.
- RBAC aplicado e auditado.
- Multi-tenant respeitado (teste de isolamento).
- Documentação da API atualizada.
- Sem segredo em código (env + rotação).

## Qualidade & engenharia
- **Testes**: domínio (motor de regras, expressões) com cobertura alta; e2e dos fluxos críticos.
- **CI/CD**: lint + typecheck + test em PR; build de imagens; deploy (Dokploy/K8s).
- **Migrations versionadas**; nunca editar migration aplicada.
- **Feature flags** para ligar fases sem quebrar produção.
