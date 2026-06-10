# STILLO IA ENGINEERING — Visão Geral & Análise de Negócio

> Plataforma de **engenharia comercial** que transforma projetos de piscina (PDF, planta baixa, dados complementares) em **orçamentos técnicos completos**, usando IA, motor de regras de engenharia, catálogos técnicos e banco de produtos.

---

## 1. O problema (estado atual)

Hoje o processo é **100% manual** e depende de um especialista escasso:

```
Projeto chega → Especialista lê PDF → Dimensiona → Escolhe equipamentos
→ Caça SKU em catálogos → Monta orçamento no Excel → Revisa → Envia
```

### Gargalos identificados

| # | Gargalo | Impacto |
|---|---------|---------|
| G1 | **Leitura manual do projeto** | 30–90 min por projeto; erro de interpretação |
| G2 | **Dimensionamento na cabeça do especialista** | Conhecimento não escala; sai com a pessoa |
| G3 | **Busca de SKU em catálogos PDF/Excel** | Lento, propenso a usar item descontinuado/errado |
| G4 | **Montagem manual do orçamento** | Retrabalho, inconsistência entre orçamentistas |
| G5 | **Sem memória institucional** | Cada correção se perde; mesmos erros se repetem |
| G6 | **Sem rastreabilidade** | Não se sabe por que um item foi escolhido |

### Custo do problema
- **Tempo médio alto** por orçamento → menos propostas/dia → menos vendas.
- **Dependência de pessoas-chave** → risco operacional.
- **Inconsistência** → margem imprevisível, retrabalho comercial.

---

## 2. A solução

Automatizar a cadeia **Leitura → Dimensionamento → Seleção de produtos → Orçamento**,
mantendo **o humano no comando** (revisão e aprovação), e fazendo o sistema **aprender** com cada correção.

```
Upload do projeto
   │
   ▼
[OCR + Parsing]  ──►  Estrutura técnica extraída (piscinas, dimensões, sistemas)
   │                         │ (correção manual sempre possível)
   ▼                         ▼
[Motor de Regras] ──► Itens técnicos necessários (LED, bombas, filtros, aquecimento...)
   │
   ▼
[Seleção de Produtos via RAG] ──► SKUs reais do catálogo, com substitutos/compatibilidades
   │
   ▼
[Orçamento estruturado]  ──►  Revisão técnica humana  ──►  Aprovação  ──►  Exportação
                                      │
                                      └──► Aprendizado (alimenta base + regras futuras)
```

### Princípio central: **Human-in-the-loop**
A IA **propõe**, o orçamentista **dispõe**. Toda saída de IA é editável, e cada correção
humana vira **dado de aprendizado** (ver `04-MOTOR-DE-REGRAS.md` e `03-IA-OCR-RAG.md`).

---

## 3. Personas & perfis (RBAC)

| Perfil | O que faz | Acesso-chave |
|--------|-----------|--------------|
| **Administrador** | Configura regras, catálogos, produtos, usuários, tenant | Tudo |
| **Diretoria** | Visão executiva, KPIs, margem | Dashboards executivos (leitura) |
| **Gerente** | Acompanha pipeline, distribui trabalho, aprova | Gestão de obras/orçamentos da equipe |
| **Orçamentista** | Roda dimensionamento, revisa, monta orçamento | Núcleo operacional |
| **Comercial** | Cadastra cliente/obra, acompanha proposta, exporta | Comercial + leitura técnica |
| **Consulta** | Apenas visualiza | Somente leitura |

> Detalhe da matriz de permissões em `05-API-E-PERMISSOES.md`.

---

## 4. Mapa de riscos (e mitigação)

### 4.1 Riscos técnicos
| Risco | Mitigação |
|-------|-----------|
| PDF escaneado ruim → OCR falha | Pipeline OCR com fallback (Tesseract → Document AI), score de confiança, revisão obrigatória abaixo do limiar |
| DWG não é texto | Fase 1: tratar DWG como anexo + extrair imagem; Fase 2: parser CAD dedicado |
| Catálogos heterogêneos (PDF/Excel/CSV/DOC) | Pipeline de ingestão normalizadora + embeddings; ver RAG |
| Acoplamento entre módulos | Arquitetura modular NestJS + contratos versionados |

### 4.2 Riscos de UX
| Risco | Mitigação |
|-------|-----------|
| Usuário com pouca afinidade tecnológica | UX "ChatGPT + Notion + ERP": telas guiadas, defaults inteligentes, zero jargão de TI |
| Medo de "a IA errar" | Tudo editável + justificativa + histórico; IA mostra **confiança** e **fonte** |
| Sobrecarga de informação | Progressive disclosure: mostra o essencial, detalhe sob demanda |

### 4.3 Riscos de IA
| Risco | Mitigação |
|-------|-----------|
| Alucinação (inventar SKU/spec) | **RAG estrito**: IA só pode citar produtos que existem no banco; resposta sem fonte é bloqueada |
| Resposta não-determinística em orçamento | **Dimensionamento = motor de regras determinístico**; IA só sugere/explica, não decide número final sozinha |
| Custo de tokens | Cache (Redis) de embeddings e respostas; modelos certos por tarefa; truncagem de contexto |
| Vazamento entre clientes (multi-tenant) | Todo dado e todo índice vetorial filtrados por `tenantId` |

### 4.4 Riscos de escalabilidade
| Risco | Mitigação |
|-------|-----------|
| Processamento pesado (OCR/IA) travando a API | **Filas BullMQ** + workers; API responde rápido, trabalho roda async |
| Banco como gargalo | Índices, paginação por cursor, read-replicas no futuro, `pgvector` para busca semântica |
| Picos de uso | Workers escaláveis horizontalmente; stateless API atrás de load balancer |
| Crescimento de dados de catálogo | Particionamento lógico por tenant; storage de blobs fora do Postgres (Supabase/S3) |

---

## 5. Metas de produto (o que "pronto" significa)

- **Tempo de orçamento**: de ~60 min → **< 10 min** (com revisão humana).
- **Consistência**: 2 orçamentistas, mesmo projeto → mesma base técnica.
- **Rastreabilidade**: todo item do orçamento tem **origem** (regra X / produto Y / ajuste humano).
- **Aprendizado**: taxa de correção humana cai ao longo do tempo (métrica de qualidade da IA).
- **Escala**: centenas de usuários simultâneos sem refatoração estrutural.

---

## 6. Decisões de arquitetura (resumo — detalhe nos ADRs)

1. **Monorepo pnpm** (`apps/api`, `apps/web`, `packages/*`) — ver [ADR-0001](adr/0001-monorepo-pnpm.md).
2. **Multi-tenant desde o dia 1** (coluna `tenantId` + escopo forçado) — ver [ADR-0002](adr/0002-multi-tenant.md).
3. **Provider de IA abstraído** (OpenAI default, troca por config) — ver [ADR-0003](adr/0003-provider-ia-abstraido.md).
4. **Dimensionamento determinístico** (motor de regras), IA como copiloto, não como fonte de verdade numérica.
5. **Tudo assíncrono e auditável**: filas para trabalho pesado, log de auditoria em toda mutação relevante.

Continua em [`01-ARQUITETURA.md`](01-ARQUITETURA.md).
