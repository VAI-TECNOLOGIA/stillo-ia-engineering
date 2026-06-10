import { avaliarExpressao } from './expression';
import { construirFatos } from './fact-builder';
import { avaliarCondicao } from './condition';
import { avaliarRegras } from './engine';
import type { RegraAvaliavel } from './types';

describe('Avaliador de expressões (seguro)', () => {
  const fatos = { 'piscina.perimetroM': 24, 'piscina.volumeM3': 48 };

  it('respeita precedência e parênteses', () => {
    expect(avaliarExpressao('2 + 3 * 4', {})).toBe(14);
    expect(avaliarExpressao('(2 + 3) * 4', {})).toBe(20);
  });

  it('resolve funções whitelisted e fatos', () => {
    // LED a cada 1,5m: teto(24 / 1.5) = 16
    expect(avaliarExpressao('teto(piscina.perimetroM / 1.5)', fatos)).toBe(16);
    expect(avaliarExpressao('max(1, piso(piscina.volumeM3 / 50))', fatos)).toBe(1);
  });

  it('bloqueia função não permitida e divisão por zero', () => {
    expect(() => avaliarExpressao('alert(1)', {})).toThrow(/não permitida/);
    expect(() => avaliarExpressao('1 / 0', {})).toThrow(/Divisão por zero/);
  });

  it('falha em fato ausente (não inventa valor)', () => {
    expect(() => avaliarExpressao('piscina.inexistente + 1', {})).toThrow(/ausente/);
  });
});

describe('FactBuilder', () => {
  it('deriva área, perímetro e volume', () => {
    const f = construirFatos(
      { comprimentoM: 8, larguraM: 4, profundidadeM: 1.5, tipo: 'EXTERNA', sistemas: ['LED'] },
      { regiao: 'NORDESTE' },
    );
    expect(f['piscina.areaM2']).toBe(32);
    expect(f['piscina.perimetroM']).toBe(24);
    expect(f['piscina.volumeM3']).toBe(48);
    expect(f['piscina.sistemas']).toEqual(['LED']);
    expect(f['piscina.interna']).toBe(false);
  });
});

describe('Avaliador de condições', () => {
  const fatos = construirFatos({ comprimentoM: 8, larguraM: 7, sistemas: ['LED', 'AQUECIMENTO'] });

  it('todas/alguma/nao e operadores', () => {
    expect(avaliarCondicao({ fato: 'piscina.larguraM', op: '>=', valor: 6 }, fatos)).toBe(true);
    expect(avaliarCondicao({ fato: 'piscina.sistemas', op: 'contem', valor: 'LED' }, fatos)).toBe(true);
    expect(
      avaliarCondicao(
        { todas: [{ fato: 'piscina.larguraM', op: '>=', valor: 6 }, { fato: 'piscina.sistemas', op: 'contem', valor: 'LED' }] },
        fatos,
      ),
    ).toBe(true);
    expect(avaliarCondicao({ nao: { fato: 'piscina.interna', op: '=', valor: true } }, fatos)).toBe(true);
  });
});

describe('Engine — avaliação ponta a ponta', () => {
  const regraLED: RegraAvaliavel = {
    id: 'r-led',
    nome: 'LED a cada 1,5m de borda',
    categoria: 'ILUMINACAO',
    prioridade: 100,
    ativo: true,
    quando: { fato: 'piscina.sistemas', op: 'contem', valor: 'LED' },
    entao: [
      {
        tipo: 'ADICIONAR_ITEM',
        categoria: 'LED',
        descricao: 'Refletor LED de embutir',
        quantidade: 'teto(piscina.perimetroM / 1.5)',
        criterioProduto: { categoria: 'LED' },
      },
    ],
  };

  const regraDuasParedes: RegraAvaliavel = {
    id: 'r-2paredes',
    nome: 'Iluminação em duas paredes (largura > 6m)',
    categoria: 'ILUMINACAO',
    prioridade: 90,
    ativo: true,
    quando: { fato: 'piscina.larguraM', op: '>', valor: 6 },
    entao: [{ tipo: 'AVISO', mensagem: 'Largura > 6m: distribuir iluminação em duas paredes.' }],
  };

  it('gera itens com quantidade calculada e trilha de explicação', () => {
    const fatos = construirFatos({ comprimentoM: 8, larguraM: 4, sistemas: ['LED'] });
    const res = avaliarRegras([regraLED, regraDuasParedes], fatos);

    expect(res.itens).toHaveLength(1);
    const led = res.itens[0];
    expect(led.categoria).toBe('LED');
    expect(led.quantidade).toBe(16); // teto(24 / 1.5)
    expect(led.regraId).toBe('r-led');
    expect(led.explicacao.fatosUsados['piscina.perimetroM']).toBe(24);
    expect(res.regrasDisparadas).toContain('r-led');
  });

  it('dispara aviso quando largura > 6m', () => {
    const fatos = construirFatos({ comprimentoM: 8, larguraM: 7, sistemas: ['LED'] });
    const res = avaliarRegras([regraLED, regraDuasParedes], fatos);
    expect(res.avisos).toContain('Largura > 6m: distribuir iluminação em duas paredes.');
  });

  it('regras inativas não participam', () => {
    const fatos = construirFatos({ comprimentoM: 8, larguraM: 4, sistemas: ['LED'] });
    const res = avaliarRegras([{ ...regraLED, ativo: false }], fatos);
    expect(res.itens).toHaveLength(0);
  });

  it('mescla itens iguais somando quantidade', () => {
    const fatos = construirFatos({ comprimentoM: 8, larguraM: 4, sistemas: ['LED'] });
    const res = avaliarRegras([regraLED, { ...regraLED, id: 'r-led-2', prioridade: 80 }], fatos);
    expect(res.itens).toHaveLength(1);
    expect(res.itens[0].quantidade).toBe(32); // 16 + 16
  });
});
