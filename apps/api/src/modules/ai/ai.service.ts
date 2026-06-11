import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { decryptSecret } from '../../common/crypto/crypto.util';
import { readTenantConfig } from '../../common/config/tenant-config';
import {
  AI_PROVIDER, AI_PROVIDERS,
  type AiCredentials, type AiProvider, type ChatMessage, type CompletionOptions, type ProviderNome,
} from './ai.types';

export type AiOrigem = 'tenant' | 'env' | 'none';

/** Fallback de ambiente por provider (quando o tenant não vinculou chave). */
const ENV_KEY: Record<ProviderNome, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

/**
 * Resolve as credenciais de IA do tenant e expõe operações de alto nível.
 * Prioridade: chave vinculada no tenant (criptografada) → variável de ambiente.
 * Suporta MÚLTIPLOS providers (consenso: openai + anthropic + gemini).
 */
@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    @Inject(AI_PROVIDERS) private readonly providers: AiProvider[],
    private readonly prisma: PrismaService,
  ) {}

  // ── credenciais por provider ────────────────────────────────────────────────

  async resolveCredsFor(tenantId: string, nome: ProviderNome): Promise<AiCredentials> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const integ = readTenantConfig(tenant?.configuracoes).integracoes?.[nome];

    if (integ?.keyEnc) {
      return {
        apiKey: decryptSecret(integ.keyEnc),
        model: integ.modelo,
        embeddingModel: integ.embeddingModel,
        baseUrl: integ.baseUrl,
      };
    }
    const envKey = process.env[ENV_KEY[nome]];
    if (envKey) {
      return nome === 'openai'
        ? { apiKey: envKey, model: process.env.OPENAI_MODEL, embeddingModel: process.env.OPENAI_EMBEDDING_MODEL }
        : { apiKey: envKey };
    }
    throw new ServiceUnavailableException(`${nome} não configurada. Vincule a chave em Configurações.`);
  }

  /** Compat: OpenAI segue como provider default (RAG/chat). */
  async resolveCreds(tenantId: string): Promise<AiCredentials> {
    return this.resolveCredsFor(tenantId, 'openai');
  }

  /** Quais providers têm chave (tenant ou env) — usado p/ decidir o consenso. */
  async providersAtivos(tenantId: string): Promise<ProviderNome[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const integ = readTenantConfig(tenant?.configuracoes).integracoes ?? {};
    const nomes: ProviderNome[] = ['openai', 'anthropic', 'gemini'];
    return nomes.filter((n) => !!integ[n]?.keyEnc || !!process.env[ENV_KEY[n]]);
  }

  // ── completar (default openai) e por provider ──────────────────────────────

  async complete(tenantId: string, messages: ChatMessage[], options?: CompletionOptions) {
    const creds = await this.resolveCreds(tenantId);
    return this.provider.complete(creds, messages, options);
  }

  /** Completa usando um provider específico (consenso). */
  async completeWith(tenantId: string, nome: ProviderNome, messages: ChatMessage[], options?: CompletionOptions) {
    const provider = this.providers.find((p) => p.nome === nome);
    if (!provider) throw new ServiceUnavailableException(`Provider ${nome} não registrado.`);
    const creds = await this.resolveCredsFor(tenantId, nome);
    return provider.complete(creds, messages, options);
  }

  async embed(tenantId: string, texts: string[]) {
    const creds = await this.resolveCreds(tenantId);
    return this.provider.embed(creds, texts);
  }

  async origem(tenantId: string): Promise<AiOrigem> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (readTenantConfig(tenant?.configuracoes).integracoes?.openai?.keyEnc) return 'tenant';
    if (process.env.OPENAI_API_KEY) return 'env';
    return 'none';
  }

  /** Testa a conexão de UM provider com 1 chamada mínima. Não lança. */
  async testarConexao(tenantId: string, nome: ProviderNome = 'openai'): Promise<{ ok: boolean; modelo?: string; erro?: string }> {
    try {
      const r = await this.completeWith(tenantId, nome, [{ role: 'user', content: 'Responda apenas: ok' }], { maxTokens: 5 });
      return { ok: true, modelo: r.model };
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : String(e) };
    }
  }
}
