/**
 * Porta de IA (ADR-0003). O provider é STATELESS: recebe as credenciais por
 * chamada — o AiService é quem resolve a chave do tenant (config criptografada)
 * ou cai no fallback de ambiente.
 */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
/** Lista de todos os adapters registrados (p/ consenso multi-IA). */
export const AI_PROVIDERS = Symbol('AI_PROVIDERS');

/** Provedores suportados no consenso. */
export type ProviderNome = 'openai' | 'anthropic' | 'gemini';

export interface AiCredentials {
  apiKey: string;
  model?: string;
  embeddingModel?: string;
  baseUrl?: string;
}

/** Parte multimodal (formato OpenAI): texto ou imagem (data URL base64 ou URL). */
export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  /** String simples (texto) ou array de partes (visão — GPT-4o lê plantas como imagem). */
  content: string | ChatContentPart[];
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  model: string;
  tokens?: number;
}

export interface AiProvider {
  /** Identidade do adapter — usada no consenso p/ rotular cada voto. */
  readonly nome: ProviderNome;
  complete(creds: AiCredentials, messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;
  embed(creds: AiCredentials, texts: string[]): Promise<number[][]>;
}

/** Util: extrai media_type + base64 puro de um data URL (p/ Anthropic/Gemini). */
export function parseDataUrl(url: string): { mediaType: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(url);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}
