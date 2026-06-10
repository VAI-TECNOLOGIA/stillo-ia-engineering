/**
 * Forma do JSON `Tenant.configuracoes`. Centraliza o contrato p/ AiService (lê)
 * e ConfigService (escreve), evitando dependência circular entre módulos.
 */
export interface OpenAiIntegracao {
  keyEnc: string; // chave criptografada (AES-256-GCM)
  modelo?: string;
  embeddingModel?: string;
  baseUrl?: string;
  vinculadoEm: string;
  vinculadoPorId?: string;
}

export interface TenantIntegracoes {
  openai?: OpenAiIntegracao;
}

export interface TenantConfig {
  integracoes?: TenantIntegracoes;
}

export function readTenantConfig(raw: unknown): TenantConfig {
  return raw && typeof raw === 'object' ? (raw as TenantConfig) : {};
}
