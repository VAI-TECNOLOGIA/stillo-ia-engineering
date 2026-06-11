import { Injectable } from '@nestjs/common';
import type { AiCredentials, AiProvider, ChatMessage, CompletionOptions, CompletionResult, ProviderNome } from './ai.types';

/**
 * Adapter OpenAI via REST (sem SDK — mantém o bundle leve e o domínio desacoplado).
 * Compatível com Azure OpenAI / proxies via baseUrl.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly nome: ProviderNome = 'openai';
  private readonly defaultBaseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

  async complete(creds: AiCredentials, messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model ?? creds.model ?? 'gpt-4o';
    const res = await fetch(`${creds.baseUrl ?? this.defaultBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.1,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model,
      tokens: data.usage?.total_tokens,
    };
  }

  async embed(creds: AiCredentials, texts: string[]): Promise<number[][]> {
    const model = creds.embeddingModel ?? 'text-embedding-3-large';
    const res = await fetch(`${creds.baseUrl ?? this.defaultBaseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.apiKey}` },
      // dimensions: 1536 casa com as colunas vector(1536) do schema (pgvector/HNSW).
      body: JSON.stringify({ model, input: texts, dimensions: 1536 }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI embeddings ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { data?: { embedding: number[] }[] };
    return (data.data ?? []).map((d) => d.embedding);
  }
}
