# ADR-0001 — Monorepo com pnpm workspaces

**Status:** Aceito · **Data:** 2026-06-05

## Contexto
Front (React/Vite) e back (NestJS) compartilham tipos de contrato (DTOs, enums de domínio, schemas Zod). Precisamos de tipagem ponta a ponta sem publicar pacotes.

## Decisão
Monorepo único com **pnpm workspaces**:
```
apps/api    → NestJS
apps/web    → React + Vite
packages/*  → contracts (tipos/zod compartilhados), config, ui (futuro)
```

## Consequências
- ✅ Tipos compartilhados sem versionar pacote; refactor atômico.
- ✅ Um `pnpm install`, scripts orquestrados na raiz.
- ✅ Caminho natural para extrair workers/serviços depois.
- ⚠️ Exige disciplina de fronteiras (não importar interno do app vizinho).

## Alternativas consideradas
- Turborepo/Nx: ótimos, mas adicionam ferramenta; pnpm puro basta no início (pode-se adotar Turbo depois sem dor).
- Dois repositórios: perde tipagem compartilhada e atomicidade.
