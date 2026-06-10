import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { encryptSecret, decryptSecret, maskSecret } from '../../common/crypto/crypto.util';
import { readTenantConfig } from '../../common/config/tenant-config';
import { AiService } from '../ai/ai.service';
import type { VincularOpenAiDto } from './dto';

@Injectable()
export class ConfigIntegracoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ai: AiService,
  ) {}

  /** Status (nunca expõe a chave — apenas mascarada). */
  async status(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const openai = readTenantConfig(tenant?.configuracoes).integracoes?.openai;
    const origem = await this.ai.origem(tenantId);

    let chaveMascarada: string | null = null;
    if (openai?.keyEnc) chaveMascarada = maskSecret(safeDecrypt(openai.keyEnc));
    else if (process.env.OPENAI_API_KEY) chaveMascarada = maskSecret(process.env.OPENAI_API_KEY);

    return {
      openai: {
        vinculado: origem !== 'none',
        origem, // 'tenant' (vinculada na config) | 'env' | 'none'
        modelo: openai?.modelo ?? process.env.OPENAI_MODEL ?? 'gpt-4o',
        chaveMascarada,
        vinculadoEm: openai?.vinculadoEm ?? null,
      },
    };
  }

  async vincularOpenAi(tenantId: string, userId: string, dto: VincularOpenAiDto) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const cfg = readTenantConfig(tenant.configuracoes);
    cfg.integracoes = cfg.integracoes ?? {};
    cfg.integracoes.openai = {
      keyEnc: encryptSecret(dto.apiKey.trim()),
      modelo: dto.modelo ?? 'gpt-4o',
      embeddingModel: dto.embeddingModel,
      baseUrl: dto.baseUrl,
      vinculadoEm: new Date().toISOString(),
      vinculadoPorId: userId,
    };
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { configuracoes: cfg as object } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'IntegracaoOpenAI', entidadeId: tenantId, depois: { vinculado: true, modelo: cfg.integracoes.openai.modelo } });
    return this.status(tenantId);
  }

  async desvincularOpenAi(tenantId: string, userId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const cfg = readTenantConfig(tenant.configuracoes);
    if (cfg.integracoes?.openai) delete cfg.integracoes.openai;
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { configuracoes: cfg as object } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'IntegracaoOpenAI', entidadeId: tenantId, depois: { vinculado: false } });
    return this.status(tenantId);
  }

  testar(tenantId: string) {
    return this.ai.testarConexao(tenantId);
  }
}

function safeDecrypt(enc: string): string {
  try {
    return decryptSecret(enc);
  } catch {
    return '';
  }
}
