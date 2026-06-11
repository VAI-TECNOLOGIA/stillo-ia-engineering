import { Injectable } from '@nestjs/common';
import {
  parseDataUrl,
  type AiCredentials, type AiProvider, type ChatContentPart, type ChatMessage,
  type CompletionOptions, type CompletionResult, type ProviderNome,
} from './ai.types';

/**
 * Adapter Anthropic (Claude) via REST — /v1/messages.
 * Suporta visão (blocos de imagem base64) para ler plantas. Sem SDK.
 * Anthropic não tem "response_format json" nativo; o prompt já exige JSON
 * e usamos temperature 0 → o parse robusto (limparJson) trata a cerca ```.
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly nome: ProviderNome = 'anthropic';
  private readonly baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1';
  private readonly version = '2023-06-01';

  async complete(creds: AiCredentials, messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model ?? creds.model ?? 'claude-sonnet-4-5';

    // Anthropic separa o system do array de mensagens.
    const system = messages.filter((m) => m.role === 'system').map((m) => this.texto(m.content)).join('\n\n');
    const turns = messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: this.toBlocks(m.content),
    }));

    const res = await fetch(`${creds.baseUrl ?? this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': creds.apiKey,
        'anthropic-version': this.version,
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0,
        ...(system ? { system } : {}),
        messages: turns,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
    return { content, model: data.model ?? model, tokens };
  }

  async embed(): Promise<number[][]> {
    // Anthropic não expõe embeddings — embeddings ficam no provider OpenAI (RAG).
    throw new Error('Anthropic não fornece embeddings; use o provider OpenAI para RAG.');
  }

  private texto(content: string | ChatContentPart[]): string {
    if (typeof content === 'string') return content;
    return content.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map((p) => p.text).join('\n');
  }

  /** Converte o conteúdo (OpenAI-like) p/ blocos Anthropic (text / image base64). */
  private toBlocks(content: string | ChatContentPart[]): unknown {
    if (typeof content === 'string') return content;
    return content.map((p) => {
      if (p.type === 'text') return { type: 'text', text: p.text };
      const parsed = parseDataUrl(p.image_url.url);
      if (parsed) return { type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 } };
      return { type: 'image', source: { type: 'url', url: p.image_url.url } };
    });
  }
}
