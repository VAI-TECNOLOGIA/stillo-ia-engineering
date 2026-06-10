import { DocumentClassifierService } from './document-classifier.service';
import type { AiService } from '../ai/ai.service';

/**
 * Testa a heurística determinística (nome + carimbo + conteúdo).
 * A IA é só desempate — não entra nestes testes.
 */
describe('DocumentClassifierService (ETAPA 1)', () => {
  const svc = new DocumentClassifierService(null as unknown as AiService);

  it('classifica pelo nome do arquivo: hidráulico', () => {
    const r = svc.heuristica('PROJ-HIDRAULICO-PISCINA-R02.pdf', 'tubulação de sucção DN50, retorno DN40, skimmer');
    expect(r.documentType).toBe('HIDRAULICO');
    expect(r.confianca).toBeGreaterThanOrEqual(0.5);
    expect(r.sinais.nomeArquivo).toBeDefined();
  });

  it('classifica pelo carimbo: planta baixa arquitetônica', () => {
    const texto = 'PLANTA BAIXA - ÁREA DE LAZER\nESC 1:50\nPISCINA ADULTO A=41,40m²\nDECK EM PEDRA ATÉRMICA\nrevestimento em pastilha';
    const r = svc.heuristica('prancha-03.pdf', texto);
    expect(r.documentType).toBe('ARQUITETONICO');
  });

  it('classifica cortes por conteúdo (cota de profundidade)', () => {
    const texto = 'CORTE AA\nPROF. 1,40\nnível d\'água\nCORTE BB profundidade 0,60';
    const r = svc.heuristica('detalhe.pdf', texto);
    expect(['CORTES', 'DETALHES_EXECUTIVOS']).toContain(r.documentType);
  });

  it('classifica memorial descritivo', () => {
    const r = svc.heuristica('MEMORIAL-DESCRITIVO.pdf', 'Memorial descritivo do projeto. Especificação técnica conforme norma ABNT NBR 10339.');
    expect(r.documentType).toBe('MEMORIAL_DESCRITIVO');
  });

  it('classifica casa de máquinas antes de hidráulico genérico', () => {
    const r = svc.heuristica('CASA-DE-MAQUINAS.pdf', 'layout da casa de máquinas, barrilete, bombas');
    expect(r.documentType).toBe('CASA_DE_MAQUINAS');
  });

  it('sem sinais → DESCONHECIDO com confiança 0 (nunca chutar)', () => {
    const r = svc.heuristica('scan001.pdf', 'texto genérico sem nenhum termo técnico de projeto');
    expect(r.documentType).toBe('DESCONHECIDO');
    expect(r.confianca).toBe(0);
  });

  it('classifica elétrico por nome e conteúdo', () => {
    const r = svc.heuristica('PROJETO-ELETRICO.pdf', 'circuito 1 — refletores LED, disjuntor 10A, transformador 12V');
    expect(r.documentType).toBe('ELETRICO');
  });
});
