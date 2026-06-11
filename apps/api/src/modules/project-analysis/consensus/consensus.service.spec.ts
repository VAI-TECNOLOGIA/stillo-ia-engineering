import { ConsensusService, POLITICA_PADRAO } from './consensus.service';
import { parseNumeroBR, normalizarComprimentoM, normalizarAreaM2, mesmoNumero } from './numeric.util';

describe('numeric.util — normalização', () => {
  it('parseNumeroBR: vírgula decimal e milhar', () => {
    expect(parseNumeroBR('1,50')).toBe(1.5);
    expect(parseNumeroBR('1.234,56')).toBe(1234.56);
    expect(parseNumeroBR('1,234.56')).toBe(1234.56);
    expect(parseNumeroBR('41,40 m²')).toBe(41.4);
    expect(parseNumeroBR(1.4)).toBe(1.4);
    expect(parseNumeroBR('abc')).toBeNull();
  });

  it('normalizarComprimentoM: cm/mm/m viram metros', () => {
    expect(normalizarComprimentoM('1,50m')).toBe(1.5);
    expect(normalizarComprimentoM('150 cm')).toBe(1.5);
    expect(normalizarComprimentoM('1500mm')).toBe(1.5);
    expect(normalizarComprimentoM(1.5)).toBe(1.5);
  });

  it('1,50m = 1.5 = 150cm (não é divergência, é formatação)', () => {
    const a = normalizarComprimentoM('1,50m')!;
    const b = normalizarComprimentoM('150cm')!;
    expect(mesmoNumero(a, b)).toBe(true);
  });

  it('normalizarAreaM2: cm² vira m²', () => {
    expect(normalizarAreaM2('41,40 m²')).toBe(41.4);
    expect(normalizarAreaM2('414000 cm²')).toBe(41.4);
  });
});

describe('ConsensusService (consenso entre IAs)', () => {
  const svc = new ConsensusService();
  const v = (provider: string, valor: number | null) => ({ provider, valor });

  it('as 3 IAs concordam → CONSENSO confiável', () => {
    const r = svc.consensoCampo('larguraM', [v('openai', 4.5), v('anthropic', 4.5), v('gemini', 4.5)]);
    expect(r.status).toBe('CONSENSO');
    expect(r.confiavel).toBe(true);
    expect(r.valor).toBe(4.5);
    expect(r.concordam).toBe(3);
  });

  it('concordância com tolerância (4.50 vs 4.502) ainda é CONSENSO', () => {
    const r = svc.consensoCampo('larguraM', [v('openai', 4.5), v('anthropic', 4.502), v('gemini', 4.5)]);
    expect(r.status).toBe('CONSENSO');
    expect(r.confiavel).toBe(true);
  });

  it('uma IA diverge (4.5/4.5/4.2) → DIVERGENTE, não confiável (política todas)', () => {
    const r = svc.consensoCampo('larguraM', [v('openai', 4.5), v('anthropic', 4.5), v('gemini', 4.2)]);
    expect(r.status).toBe('DIVERGENTE');
    expect(r.confiavel).toBe(false);
    expect(r.valor).toBeNull();
    expect(r.concordam).toBe(2); // 2 concordam, mas política exige todas
  });

  it('política maioria: 2 de 3 concordam → MAIORIA confiável', () => {
    const r = svc.consensoCampo('larguraM',
      [v('openai', 4.5), v('anthropic', 4.5), v('gemini', 4.2)],
      { ...POLITICA_PADRAO, modo: 'maioria' });
    expect(r.status).toBe('MAIORIA');
    expect(r.confiavel).toBe(true);
    expect(r.valor).toBe(4.5);
  });

  it('três valores diferentes → DIVERGENTE mesmo em política maioria', () => {
    const r = svc.consensoCampo('profundidadeM',
      [v('openai', 1.5), v('anthropic', 1.4), v('gemini', 1.6)],
      { ...POLITICA_PADRAO, modo: 'maioria' });
    expect(r.status).toBe('DIVERGENTE');
    expect(r.confiavel).toBe(false);
  });

  it('só uma IA leu → LIDO_POR_UMA (sem corroboração)', () => {
    const r = svc.consensoCampo('larguraM', [v('openai', 4.5), v('anthropic', null), v('gemini', null)]);
    expect(r.status).toBe('LIDO_POR_UMA');
    expect(r.confiavel).toBe(false);
  });

  it('nenhuma IA leu → NAO_LIDO', () => {
    const r = svc.consensoCampo('volumeM3', [v('openai', null), v('anthropic', null), v('gemini', null)]);
    expect(r.status).toBe('NAO_LIDO');
    expect(r.confiavel).toBe(false);
  });

  it('consolidar vários campos + extrair pendências', () => {
    const leituras = [
      { provider: 'openai',    campos: { larguraM: 4.5, comprimentoM: 8.0, profundidadeM: 1.5 } },
      { provider: 'anthropic', campos: { larguraM: 4.5, comprimentoM: 8.0, profundidadeM: 1.4 } },
      { provider: 'gemini',    campos: { larguraM: 4.5, comprimentoM: 8.0, profundidadeM: null } },
    ];
    const consensos = svc.consolidar(leituras, ['larguraM', 'comprimentoM', 'profundidadeM']);
    expect(consensos.find((c) => c.campo === 'larguraM')!.status).toBe('CONSENSO');
    expect(consensos.find((c) => c.campo === 'comprimentoM')!.status).toBe('CONSENSO');
    // profundidade: 1.5/1.4/null → 2 leram e divergem → DIVERGENTE
    expect(consensos.find((c) => c.campo === 'profundidadeM')!.status).toBe('DIVERGENTE');

    const pend = svc.pendencias(consensos);
    expect(pend).toHaveLength(1);
    expect(pend[0].campo).toBe('profundidadeM');
  });

  it('mensagem de notificação cita as leituras divergentes', () => {
    const c = svc.consensoCampo('larguraM', [v('openai', 4.5), v('anthropic', 4.5), v('gemini', 4.2)]);
    const msg = svc.mensagemPendencia(c, 'a largura da piscina');
    expect(msg).toContain('a largura da piscina');
    expect(msg).toContain('ilegível');
    expect(msg).toMatch(/gemini: 4\.2/);
  });
});
