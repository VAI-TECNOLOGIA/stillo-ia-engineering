import { Injectable } from '@nestjs/common';
import {
  parseDataUrl,
  type AiCredentials, type AiProvider, type ChatContentPart, type ChatMessage,
  type CompletionOptions, type CompletionResult, type ProviderNome,
} from './ai.types';

/**
 * Adapter Google Gemini via REST — generativeLanguage v1beta.
 * Suporta visão (inlineData base64) e JSON nativo (responseMimeType). Sem SDK.
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly nome: ProviderNome = 'gemini';
  private readonly baseUrl = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';

  async complete(creds: AiCredentials, messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model ?? creds.model ?? 'gemini-2.5-flash';

    const system = messages.filter((m) => m.role === 'system').map((m) => this.texto(m.content)).join('\n\n');
    const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: this.toParts(m.content),
    }));

    const url = `${creds.baseUrl ?? this.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(creds.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0,
          ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
          ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };
    const content = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    return { content, model, tokens: data.usageMetadata?.totalTokenCount };
  }

  async embed(): Promise<number[][]> {
    throw new Error('Gemini embeddings não usados aqui; RAG usa o provider OpenAI.');
  }

  private texto(content: string | ChatContentPart[]): string {
    if (typeof content === 'string') return content;
    return content.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map((p) => p.text).join('\n');
  }

  /** Converte o conteúdo (OpenAI-like) p/ parts Gemini (text / inlineData base64). */
  private toParts(content: string | ChatContentPart[]): unknown[] {
    if (typeof content === 'string') return [{ text: content }];
    return content.map((p) => {
      if (p.type === 'text') return { text: p.text };
      const parsed = parseDataUrl(p.image_url.url);
      if (parsed) return { inlineData: { mimeType: parsed.mediaType, data: parsed.base64 } };
      return { text: `[imagem em ${p.image_url.url}]` };
    });
  }
}
