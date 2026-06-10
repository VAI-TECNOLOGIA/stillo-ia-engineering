import { agregarEstatisticas, detectarPadroes, type CorrecaoLike } from './aprendizado-analytics';

const C = (over: Partial<CorrecaoLike>): CorrecaoLike => ({
  entidade: 'OrcamentoItem', de: {}, para: {}, justificativa: null, createdAt: '2026-06-01T10:00:00Z', ...over,
});

describe('agregarEstatisticas', () => {
  it('conta total, justificativas, trocas de produto e agrupa por dia/entidade', () => {
    const e = agregarEstatisticas([
      C({ de: { produtoId: 'a', descricao: 'X' }, para: { produtoId: 'b' }, justificativa: 'cliente pediu', createdAt: '2026-06-01T10:00:00Z' }),
      C({ de: { produtoId: 'a' }, para: { produtoId: 'a' }, createdAt: '2026-06-01T12:00:00Z' }), // sem troca real
      C({ entidade: 'Leitura', createdAt: '2026-06-02T08:00:00Z' }),
    ]);
    expect(e.total).toBe(3);
    expect(e.comJustificativa).toBe(1);
    expect(e.produtosTrocados).toBe(1);
    expect(e.porEntidade.find((x) => x.entidade === 'OrcamentoItem')?.total).toBe(2);
    expect(e.porDia).toEqual([{ dia: '2026-06-01', total: 2 }, { dia: '2026-06-02', total: 1 }]);
  });
});

describe('detectarPadroes', () => {
  it('detecta troca de produto recorrente (>= min)', () => {
    const padroes = detectarPadroes([
      C({ de: { produtoId: 'a', descricao: 'LED' }, para: { produtoId: 'b' } }),
      C({ de: { produtoId: 'a', descricao: 'LED' }, para: { produtoId: 'b' } }),
    ]);
    expect(padroes).toHaveLength(1);
    expect(padroes[0].tipo).toBe('TROCA_PRODUTO');
    expect(padroes[0].ocorrencias).toBe(2);
  });

  it('detecta remoção recorrente e ignora padrões abaixo do limiar', () => {
    const padroes = detectarPadroes([
      C({ de: { descricao: 'Kit X' }, para: {} }),
      C({ de: { descricao: 'Kit X' }, para: {} }),
      C({ de: { descricao: 'Item raro' }, para: {} }), // só 1x → ignorado
    ]);
    const remocao = padroes.find((p) => p.tipo === 'REMOCAO');
    expect(remocao?.chave).toBe('Kit X');
    expect(remocao?.ocorrencias).toBe(2);
    expect(padroes.find((p) => p.chave === 'Item raro')).toBeUndefined();
  });
});
