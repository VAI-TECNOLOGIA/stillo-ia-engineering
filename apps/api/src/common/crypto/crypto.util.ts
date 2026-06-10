import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Criptografia simétrica para segredos em repouso (ex.: chave da OpenAI por tenant).
 * AES-256-GCM (autenticado). Formato persistido: "iv:tag:ciphertext" (base64).
 *
 * A chave-mestra vem de ENCRYPTION_KEY (qualquer string; é derivada p/ 32 bytes).
 * Em produção, defina ENCRYPTION_KEY forte e fora do código.
 */
const ALGO = 'aes-256-gcm';

function masterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? 'dev-encryption-key-troque-em-producao';
  return createHash('sha256').update(raw).digest(); // 32 bytes determinísticos
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const [ivB, tagB, encB] = payload.split(':');
  if (!ivB || !tagB || !encB) throw new Error('Segredo criptografado em formato inválido.');
  const decipher = createDecipheriv(ALGO, masterKey(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB, 'base64')), decipher.final()]).toString('utf8');
}

/** Mascara um segredo p/ exibição (ex.: "sk-...AB12"). */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  if (plain.length <= 8) return '••••';
  return `${plain.slice(0, 3)}••••${plain.slice(-4)}`;
}
