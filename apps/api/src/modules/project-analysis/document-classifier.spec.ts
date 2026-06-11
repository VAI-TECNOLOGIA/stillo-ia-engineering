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

/**
 * Regressão com NOMES REAIS de prancha (nomenclatura técnica BR) — extraídos dos
 * 18 PDFs de projeto do cliente. O código de disciplina no nome é o sinal dominante:
 * o conteúdo de uma planta de lazer cita todas as disciplinas e confundia o classificador.
 */
describe('DocumentClassifierService — códigos de prancha reais', () => {
  const svc = new DocumentClassifierService(null as unknown as AiService);
  // conteúdo de planta de lazer "polui" com termos hidráulicos/elétricos de propósito:
  const conteudoPoluido = 'skimmer dreno de fundo retorno bomba filtro refletor LED circuito disjuntor tubulação';

  const casos: [string, string][] = [
    ['017-PIS-LO-0002-004-LAZ-T00-R02.pdf', 'ARQUITETONICO'],   // LAZ → lazer, era Hidráulico
    ['017-PIS-LO-0003-004-DET-T00-R00.pdf', 'DETALHES_EXECUTIVOS'], // DET, era Hidráulico
    ['005-EX-PIS-PB-002-LAZ-R03.pdf', 'ARQUITETONICO'],         // PB+LAZ, era Elétrico
    ['OCE-ARQ-EX-0106-LAZ-T00-R23.pdf', 'ARQUITETONICO'],       // ARQ
    ['20008-HID-13-RV00-PISCINA.pdf', 'HIDRAULICO'],            // HID
    ['SUN-HID-EX-09-PIS-T01-R05.pdf', 'HIDRAULICO'],            // HID
    ['BOC-ARQ-EXE-005-LAZ-R06.pdf', 'ARQUITETONICO'],          // ARQ
    ['BOC-HID-EXE-12-PIS-R01.pdf', 'HIDRAULICO'],              // HID
    ['GC_ARQ_LEGAL_09_LAZER_R02.pdf', 'ARQUITETONICO'],       // ARQ (underscore)
    ['H290-ARQ-EX-PLA-R04-P06-Lazer.pdf', 'ARQUITETONICO'],   // ARQ
  ];

  it.each(casos)('classifica "%s" → %s mesmo com conteúdo poluído', (nome, esperado) => {
    const r = svc.heuristica(nome, conteudoPoluido);
    expect(r.documentType).toBe(esperado);
    expect(r.confianca).toBeGreaterThanOrEqual(0.8);
  });
});
