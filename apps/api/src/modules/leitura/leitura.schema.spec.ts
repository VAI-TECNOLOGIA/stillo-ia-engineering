import { parseExtraction, ProjetoExtraidoSchema, volumeM3 } from './leitura.schema';

describe('leitura.schema', () => {
  it('parseia JSON puro válido', () => {
    const raw = JSON.stringify({
      piscinas: [{ nome: 'Principal', comprimentoM: 8, larguraM: 4, sistemas: ['LED'], confianca: 0.9 }],
      avisos: [],
    });
    const res = parseExtraction(raw);
    expect(res.piscinas).toHaveLength(1);
    expect(res.piscinas[0].sistemas).toEqual(['LED']);
  });

  it('parseia resposta cercada por ```json', () => {
    const raw = '```json\n{"piscinas":[],"avisos":["nada encontrado"]}\n```';
    const res = parseExtraction(raw);
    expect(res.avisos).toContain('nada encontrado');
  });

  it('aplica defaults (sistemas vazio, confianca 0.5)', () => {
    const res = ProjetoExtraidoSchema.parse({ piscinas: [{ nome: 'X' }] });
    expect(res.piscinas[0].sistemas).toEqual([]);
    expect(res.piscinas[0].confianca).toBe(0.5);
  });

  it('rejeita sistema inválido', () => {
    expect(() => parseExtraction(JSON.stringify({ piscinas: [{ sistemas: ['RAIO_LASER'] }] }))).toThrow();
  });

  it('calcula volume só com as 3 medidas', () => {
    expect(volumeM3({ comprimentoM: 8, larguraM: 4, profundidadeM: 1.5, sistemas: [], confianca: 1 })).toBe(48);
    expect(volumeM3({ comprimentoM: 8, larguraM: 4, sistemas: [], confianca: 1 })).toBeUndefined();
  });
});
