# ADR-0003 — Provider de IA/OCR/Storage abstraído (Ports & Adapters)

**Status:** Aceito · **Data:** 2026-06-05

## Contexto
O escopo fixa OpenAI GPT, embeddings, OCR e Supabase Storage. Mas: preços, qualidade e disponibilidade mudam; clientes podem exigir Azure OpenAI (compliance) ou outro OCR. Não podemos acoplar o domínio a um fornecedor.

## Decisão
Definir **portas (interfaces)** no domínio e **adapters** na infra:

```ts
interface AiProvider {
  complete(input): Promise<Completion>
  embed(texts: string[]): Promise<number[][]>
}
interface OcrProvider { extract(file): Promise<OcrResult> }
interface StorageProvider { put/get/sign(...) }
```

Seleção por env: `AI_PROVIDER`, `OCR_PROVIDER`, `STORAGE_PROVIDER`.
Default conforme escopo: **OpenAI** (`gpt-4o`, `text-embedding-3-large`), **Tesseract→Document AI**, **Supabase Storage**.

## Consequências
- ✅ Trocar fornecedor = trocar um adapter (sem tocar no domínio).
- ✅ Testes usam adapter fake (rápidos, sem custo/rede).
- ✅ Métricas (tokens, custo, latência) centralizadas no ponto da porta.
- ✅ Preparado para roteamento por tarefa (modelo barato p/ classificação, forte p/ extração).
- ⚠️ Pequena camada de indireção a manter — compensa pelo desacoplamento.

## Nota
Mesmo com OpenAI como default (exigência do escopo), a abstração deixa Claude/Azure como troca de configuração, não de arquitetura.
