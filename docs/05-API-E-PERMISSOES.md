# 05 — API & Permissões (RBAC)

REST sob `/api/v1`, JSON, autenticação **Bearer JWT** (access curto + refresh rotativo).
Erros padronizados (RFC 7807-like). Paginação por cursor. Toda rota é **tenant-scoped**.

## 1. Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | email+senha → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | refresh válido → novo par (rotação; revoga o antigo) |
| POST | `/auth/logout` | revoga refresh |
| GET  | `/auth/me` | usuário atual + permissões |

Access token TTL 15 min; refresh 30 dias (hash em banco, rotação a cada uso, detecção de reuso → revoga família).

## 2. Endpoints por módulo (resumo)

```
# Clientes
GET    /clientes?cursor=&q=          POST /clientes
GET    /clientes/:id                 PATCH /clientes/:id        DELETE /clientes/:id
GET    /clientes/:id/historico

# Obras
GET    /obras                        POST /obras
GET    /obras/:id                    PATCH /obras/:id
POST   /obras/:id/arquivos           # upload (multipart) → enfileira processamento
GET    /obras/:id/arquivos/:arqId    # status + resultado OCR

# Leitura inteligente
POST   /obras/:id/leitura            # dispara extração IA
GET    /obras/:id/leitura            # estrutura extraída (editável)
PATCH  /obras/:id/leitura            # correção manual

# Piscinas
GET/POST/PATCH/DELETE /obras/:id/piscinas[/:pid]

# Motor de regras (admin)
GET    /regras                       POST /regras
PATCH  /regras/:id                   DELETE /regras/:id
GET    /regras/:id/versoes
POST   /regras/:id/simular           # dry-run contra piscina de exemplo

# Catálogos & produtos
POST   /catalogos                    # upload → indexação (fila)
GET    /catalogos/:id                # status de indexação
GET    /produtos?q=&categoria=       POST /produtos
PATCH  /produtos/:id                 DELETE /produtos/:id

# IA técnica (chat RAG)
POST   /ia/chat                      # { mensagem, contexto } → resposta + fontes
GET    /ia/conversas/:id

# Dimensionamento
POST   /obras/:id/dimensionamento    # "GERAR DIMENSIONAMENTO" (fila) → itens
GET    /obras/:id/dimensionamento

# Orçamento
POST   /obras/:id/orcamentos         # cria a partir do dimensionamento
GET    /orcamentos/:id
PATCH  /orcamentos/:id/itens/:itemId # trocar/editar/remover item (gera Correcao)
POST   /orcamentos/:id/itens         # adicionar item manual
POST   /orcamentos/:id/aprovar
GET    /orcamentos/:id/versoes       # histórico
GET    /orcamentos/:id/versoes/diff?a=&b=
POST   /orcamentos/:id/exportar      # { formato: pdf|docx|xlsx } → arquivo

# Dashboards
GET    /dashboard/operacional
GET    /dashboard/executivo

# Auditoria (admin/diretoria)
GET    /auditoria?entidade=&autor=&periodo=
```

## 3. Matriz de permissões (RBAC)

Permissões no formato `recurso:acao`. Cada perfil herda um conjunto. Checagem via `@RequirePermissions()` + `PermissionsGuard`.

| Recurso \ Perfil | Admin | Diretoria | Gerente | Orçamentista | Comercial | Consulta |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| clientes:ler | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| clientes:escrever | ✅ | — | ✅ | ✅ | ✅ | — |
| obras:escrever | ✅ | — | ✅ | ✅ | ✅ | — |
| leitura:executar | ✅ | — | ✅ | ✅ | ✅ | — |
| dimensionamento:executar | ✅ | — | ✅ | ✅ | — | — |
| regras:gerir | ✅ | — | — | — | — | — |
| catalogos:gerir | ✅ | — | — | — | — | — |
| produtos:escrever | ✅ | — | ✅ | — | — | — |
| orcamento:revisar | ✅ | — | ✅ | ✅ | — | — |
| orcamento:aprovar | ✅ | ✅ | ✅ | — | — | — |
| orcamento:exportar | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| dashboard:executivo | ✅ | ✅ | ✅ | — | — | — |
| usuarios:gerir | ✅ | — | — | — | — | — |
| auditoria:ler | ✅ | ✅ | — | — | — | — |

> A matriz vive em código (`common/rbac/permissions.ts`) como fonte única, e é exposta em `/auth/me` para o front esconder/mostrar ações.

## 4. Convenções
- **Idempotência**: uploads e disparos de fila aceitam `Idempotency-Key`.
- **Validação**: DTOs com Zod/`class-validator`; 422 com detalhe de campo.
- **Rate limiting** por tenant nas rotas de IA.
- **Versionamento**: prefixo `/v1`; mudanças breaking → `/v2`.
- **Auditoria automática** via interceptor em rotas de escrita sensíveis.
