import { montarItensOrcamento } from './orcamento-builder';

describe('montarItensOrcamento', () => {
  it('mapeia itens com preço do produto e calcula subtotais + total', () => {
    const { itens, valorTotal } = montarItensOrcamento([
      { descricao: 'LED', quantidade: 4, regraId: 'r1', produtoSugeridoId: 'p1', produtoSugerido: { id: 'p1', preco: '89.90' } },
      { descricao: 'Bomba', quantidade: 1, regraId: 'r2', produtoSugeridoId: 'p2', produtoSugerido: { id: 'p2', preco: 740 } },
    ]);
    expect(itens[0].precoUnit).toBe(89.9);
    expect(itens[0].subtotal).toBe(359.6); // 4 × 89.90
    expect(itens[0].origem).toBe('REGRA');
    expect(valorTotal).toBe(1099.6); // 359.60 + 740
  });

  it('origem MANUAL quando não há regra nem produto', () => {
    const { itens } = montarItensOrcamento([{ descricao: 'Item solto', quantidade: 1 }]);
    expect(itens[0].origem).toBe('MANUAL');
    expect(itens[0].precoUnit).toBe(0);
    expect(itens[0].produtoId).toBeNull();
  });

  it('origem IA_RAG quando há produto mas não regra', () => {
    const { itens } = montarItensOrcamento([{ descricao: 'X', quantidade: 2, produtoSugeridoId: 'p9', produtoSugerido: { id: 'p9', preco: 10 } }]);
    expect(itens[0].origem).toBe('IA_RAG');
    expect(itens[0].subtotal).toBe(20);
  });
});
