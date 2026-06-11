import { ConsensusExtractionService } from './consensus-extraction.service';
import { ConsensusService } from './consensus.service';
import type { AiService } from '../../ai/ai.service';
import type { ExtractorRegistry } from '../extractors/extractor.registry';

const EVID = (valor: unknown) => ({ valor, fonte: 'PLANTA', pagina: 1, status: 'CONFIRMADO' as const });

/** Extração arquitetônica fake parametrizável por largura/profundidade. */
function extracaoFake(area: number, largura: number) {
  return {
    disciplina: 'ARQUITETONICO',
    corposDagua: [{
      nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO',
      areaM2: EVID(area), larguraM: EVID(largura), comprimentoM: EVID(8.0),
    }],
  };
}

describe('ConsensusExtractionService (orquestração do consenso entre IAs)', () => {
  const consensus = new ConsensusService();

  function montar(extracoesPorProvider: Record<string, unknown>) {
    const providers = Object.keys(extracoesPorProvider);
    const ai = {
      providersAtivos: async () => providers,
    } as unknown as AiService;
    const extractor = {
      // o provider chega como 4º argumento de extrair()
      extrair: async (_t: string, _txt: string, _imgs: string[], provider: string) =>
        ({ extracao: extracoesPorProvider[provider], erro: undefined }),
    };
    const registry = { get: () => extractor } as unknown as ExtractorRegistry;
    return new ConsensusExtractionService(ai, registry, consensus);
  }

  it('as 3 IAs leem os mesmos dados → aprovado, sem notificação', async () => {
    const svc = montar({
      openai: extracaoFake(36, 4.5),
      anthropic: extracaoFake(36, 4.5),
      gemini: extracaoFake(36, 4.5),
    });
    const r = await svc.extrairComConsenso('t1', 'ARQUITETONICO', 'texto do projeto…');
    expect(r.providersUsados).toHaveLength(3);
    expect(r.aprovado).toBe(true);
    expect(r.notificacoes).toHaveLength(0);
    expect(r.confirmados.find((c) => c.campo === 'PISCINA_ADULTO.larguraM')!.valor).toBe(4.5);
  });

  it('uma IA diverge na largura → NÃO aprovado, notifica o usuário', async () => {
    const svc = montar({
      openai: extracaoFake(36, 4.5),
      anthropic: extracaoFake(36, 4.5),
      gemini: extracaoFake(36, 4.2), // divergiu
    });
    const r = await svc.extrairComConsenso('t1', 'ARQUITETONICO', 'texto…');
    expect(r.aprovado).toBe(false);
    expect(r.notificacoes.some((m) => m.includes('a largura da piscina adulto') && m.includes('ilegível'))).toBe(true);
    // área e comprimento bateram → continuam confirmados
    expect(r.confirmados.some((c) => c.campo === 'PISCINA_ADULTO.areaM2')).toBe(true);
  });

  it('formatação diferente (4,50 vs 450cm) NÃO é divergência', async () => {
    const svc = montar({
      openai: extracaoFake(36, 4.5),
      anthropic: { disciplina: 'ARQUITETONICO', corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID(36), larguraM: EVID('450 cm'), comprimentoM: EVID(8.0) }] },
      gemini: extracaoFake(36, 4.5),
    });
    const r = await svc.extrairComConsenso('t1', 'ARQUITETONICO', 'texto…');
    expect(r.aprovado).toBe(true);
    expect(r.notificacoes).toHaveLength(0);
  });

  it('sem providers configurados → não aprovado, vazio', async () => {
    const svc = montar({});
    const r = await svc.extrairComConsenso('t1', 'ARQUITETONICO', 'texto…');
    expect(r.aprovado).toBe(false);
    expect(r.providersUsados).toHaveLength(0);
  });
});
