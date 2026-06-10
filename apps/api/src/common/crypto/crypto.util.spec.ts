import { decryptSecret, encryptSecret, maskSecret } from './crypto.util';

describe('crypto.util', () => {
  it('faz round-trip de criptografia (encrypt → decrypt)', () => {
    const segredo = 'sk-test-1234567890ABCDEF';
    const enc = encryptSecret(segredo);
    expect(enc).not.toContain(segredo);
    expect(enc.split(':')).toHaveLength(3);
    expect(decryptSecret(enc)).toBe(segredo);
  });

  it('gera ciphertext diferente a cada chamada (IV aleatório)', () => {
    expect(encryptSecret('mesmo-valor')).not.toBe(encryptSecret('mesmo-valor'));
  });

  it('detecta adulteração (GCM auth tag)', () => {
    const enc = encryptSecret('valor');
    const [iv, tag, ct] = enc.split(':');
    const adulterado = [iv, tag, Buffer.from('hackeado').toString('base64')].join(':');
    expect(() => decryptSecret(adulterado)).toThrow();
  });

  it('mascara segredos para exibição', () => {
    expect(maskSecret('sk-abcdefgh1234')).toBe('sk-••••1234');
    expect(maskSecret('curta')).toBe('••••');
  });
});
