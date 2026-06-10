import { tempoMedioMinutos, tendenciaPorMes, topPorChave } from './dashboard-analytics';

describe('tempoMedioMinutos', () => {
  it('calcula média em minutos só dos aprovados', () => {
    const r = tempoMedioMinutos([
      { createdAt: '2026-06-01T10:00:00Z', aprovadoEm: '2026-06-01T10:30:00Z' }, // 30min
      { createdAt: '2026-06-01T10:00:00Z', aprovadoEm: '2026-06-01T10:10:00Z' }, // 10min
      { createdAt: '2026-06-01T10:00:00Z', aprovadoEm: null }, // ignorado
    ]);
    expect(r).toBe(20);
  });
  it('retorna null sem aprovados', () => {
    expect(tempoMedioMinutos([{ createdAt: '2026-06-01', aprovadoEm: null }])).toBeNull();
  });
});

describe('tendenciaPorMes', () => {
  it('agrupa por mês e soma valor', () => {
    const t = tendenciaPorMes([
      { createdAt: '2026-05-10', valorTotal: 100 },
      { createdAt: '2026-05-20', valorTotal: '50' },
      { createdAt: '2026-06-01', valorTotal: 200 },
    ]);
    expect(t).toEqual([
      { mes: '2026-05', total: 2, valor: 150 },
      { mes: '2026-06', total: 1, valor: 200 },
    ]);
  });
});

describe('topPorChave', () => {
  it('soma e ordena decrescente, ignorando chave nula', () => {
    const t = topPorChave(
      [{ f: 'A', q: 2 }, { f: 'B', q: 6 }, { f: 'A', q: 3 }, { f: null, q: 9 }],
      (x) => x.f, (x) => x.q, 2,
    );
    expect(t).toEqual([{ chave: 'B', total: 6 }, { chave: 'A', total: 5 }]);
  });
});
