import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { decryptSecret } from '../../common/crypto/crypto.util';
import { readTenantConfig } from '../../common/config/tenant-config';
import { AI_PROVIDER, type AiCredentials, type AiProvider, type ChatMessage, type CompletionOptions } from './ai.types';

export type AiOrigem = 'tenant' | 'env' | 'none';

/**
 * Resolve as credenciais de IA do tenant e expõe operações de alto nível.
 * Prioridade: chave vinculada no tenant (criptografada) → variável de ambiente.
 */
@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly prisma: PrismaService,
  ) {}

  async resolveCreds(tenantId: string): Promise<AiCredentials> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const openai = readTenantConfig(tenant?.configuracoes).integracoes?.openai;

    if (openai?.keyEnc) {
      return {
        apiKey: decryptSecret(openai.keyEnc),
        model: openai.modelo,
        embeddingModel: openai.embeddingModel,
        baseUrl: openai.baseUrl,
      };
    }
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) {
      return { apiKey: envKey, model: process.env.OPENAI_MODEL, embeddingModel: process.env.OPENAI_EMBEDDING_MODEL };
    }
    throw new ServiceUnavailableException('OpenAI não configurada. Vincule sua chave em Configurações.');
  }

  async origem(tenantId: string): Promise<AiOrigem> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (readTenantConfig(tenant?.configuracoes).integracoes?.openai?.keyEnc) return 'tenant';
    if (process.env.OPENAI_API_KEY) return 'env';
    return 'none';
  }

  async complete(tenantId: string, messages: ChatMessage[], options?: CompletionOptions) {
    const creds = await this.resolveCreds(tenantId);
    return this.provider.complete(creds, messages, options);
  }

  async embed(tenantId: string, texts: string[]) {
    const creds = await this.resolveCreds(tenantId);
    return this.provider.embed(creds, texts);
  }

  /** Testa a conexão com 1 chamada mínima. Não lança: devolve {ok,...}. */
  async testarConexao(tenantId: string): Promise<{ ok: boolean; modelo?: string; erro?: string }> {
    try {
      const r = await this.complete(tenantId, [{ role: 'user', content: 'Responda apenas: ok' }], { maxTokens: 5 });
      return { ok: true, modelo: r.model };
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : String(e) };
    }
  }
}
