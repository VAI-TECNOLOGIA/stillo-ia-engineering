import { ProjectConsolidatorService } from './project-consolidator.service';
import type { DocumentoAnalisado } from './consolidation.types';

const EVID_OK = (valor: number | string | boolean, fonte: string, pagina = 1) =>
  ({ valor, fonte, pagina, status: 'CONFIRMADO' as const });
const EVID_NULL = { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' as const };

function docArq(extracao: object): DocumentoAnalisado {
  return { documentAnalysisId: 'da1', arquivoId: 'a1', nomeArquivo: 'ARQ-LAZER.pdf', documentType: 'ARQUITETONICO', extracao };
}
function docCortes(extracao: object): DocumentoAnalisado {
  return { documentAnalysisId: 'da2', arquivoId: 'a2', nomeArquivo: 'CORTES.pdf', documentType: 'CORTES', extracao };
}
function docHid(extracao: object): DocumentoAnalisado {
  return { documentAnalysisId: 'da3', arquivoId: 'a3', nomeArquivo: 'HID.pdf', documentType: 'HIDRAULICO', extracao };
}
function docMem(extracao: object): DocumentoAnalisado {
  return { documentAnalysisId: 'da4', arquivoId: 'a4', nomeArquivo: 'MEMORIAL.pdf', documentType: 'MEMORIAL_DESCRITIVO', extracao };
}

describe('ProjectConsolidatorService (ETAPA 4)', () => {
  const svc = new ProjectConsolidatorService();

  it('une arquitetônico (área) + corte (profundidade) + hidráulico (bomba) no mesmo corpo', () => {
    const c = svc.consolidar([
      docArq({
        corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'PLANTA BAIXA - LAZER'), comprimentoM: EVID_NULL, larguraM: EVID_NULL, formato: EVID_NULL }],
        deckAreaM2: EVID_OK(65.8, 'PLANTA BAIXA - LAZER'), sauna: EVID_OK(true, 'PLANTA BAIXA - LAZER'),
        bordaInfinita: EVID_NULL, revestimentos: [], observacoes: [],
      }),
      docCortes({
        profundidades: [{ referencia: 'PISCINA ADULTO — CORTE AA', profundidadeMinM: EVID_NULL, profundidadeMaxM: EVID_OK(1.4, 'CORTE AA') }],
        niveis: [], detalhesConstrutivos: [], observacoes: [],
      }),
      docHid({
        bombas: [{ descricao: EVID_OK('Motobomba 3/4cv', 'QUADRO HIDRÁULICO'), potenciaCv: EVID_OK(0.75, 'QUADRO HIDRÁULICO'), vazaoM3h: EVID_NULL, quantidade: EVID_OK(1, 'QUADRO HIDRÁULICO') }],
        filtros: [], tubulacoes: [], dispositivos: [], aquecimento: { existe: EVID_NULL, tipo: EVID_NULL, potencia: EVID_NULL }, observacoes: [],
      }),
    ]);

    expect(c.corposDagua).toHaveLength(1);
    const corpo = c.corposDagua[0];
    expect(corpo.areaM2.valor).toBe(41.4);
    expect(corpo.areaM2.fontes[0].documento).toBe('ARQ-LAZER.pdf');
    expect(corpo.profundidadeMaxM.valor).toBe(1.4);
    expect(corpo.profundidadeMaxM.fontes[0].documento).toBe('CORTES.pdf');
    // bomba consolidada com evidência
    expect(c.equipamentos.some((e) => e.categoria === 'BOMBA' && e.quantidade.valor === 1)).toBe(true);
    // sistemas derivados de evidências diretas
    expect(c.sistemas.map((s) => s.sistema)).toEqual(expect.arrayContaining(['FILTRAGEM', 'SAUNA']));
  });

  it('valores compatíveis somam fontes (corroboração); nunca sobrescreve', () => {
    const c = svc.consolidar([
      docArq({ corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'PLANTA'), comprimentoM: EVID_NULL, larguraM: EVID_NULL, formato: EVID_NULL }], deckAreaM2: EVID_NULL, sauna: EVID_NULL, bordaInfinita: EVID_NULL, revestimentos: [], observacoes: [] }),
      docMem({ corposDagua: [{ nome: 'piscina adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'MEMORIAL item 2.1'), volumeM3: EVID_NULL, profundidadeM: EVID_NULL }], sistemas: [], especificacoes: [], observacoes: [] }),
    ]);

    const corpo = c.corposDagua[0];
    expect(c.corposDagua).toHaveLength(1);       // matching por tipoCorpo
    expect(corpo.areaM2.status).toBe('CONFIRMADO');
    expect(corpo.areaM2.fontes).toHaveLength(2); // duas fontes corroboram
    expect(c.conflitos).toHaveLength(0);
  });

  it('divergência entre documentos vira CONFLITO (valor null + ambas as fontes preservadas)', () => {
    const c = svc.consolidar([
      docArq({ corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'PLANTA'), comprimentoM: EVID_NULL, larguraM: EVID_NULL, formato: EVID_NULL }], deckAreaM2: EVID_NULL, sauna: EVID_NULL, bordaInfinita: EVID_NULL, revestimentos: [], observacoes: [] }),
      docMem({ corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(50, 'MEMORIAL'), volumeM3: EVID_NULL, profundidadeM: EVID_NULL }], sistemas: [], especificacoes: [], observacoes: [] }),
    ]);

    const corpo = c.corposDagua[0];
    expect(corpo.areaM2.status).toBe('CONFLITO');
    expect(corpo.areaM2.valor).toBeNull();
    expect(corpo.areaM2.fontes).toHaveLength(2);
    expect(c.conflitos.some((cf) => cf.campo === 'areaM2')).toBe(true);
  });

  it('NUNCA calcula volume: sem evidência escrita, volume permanece NAO_IDENTIFICADO', () => {
    const c = svc.consolidar([
      docArq({ corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'PLANTA'), comprimentoM: EVID_OK(9, 'PLANTA'), larguraM: EVID_OK(4.6, 'PLANTA'), formato: EVID_NULL }], deckAreaM2: EVID_NULL, sauna: EVID_NULL, bordaInfinita: EVID_NULL, revestimentos: [], observacoes: [] }),
      docCortes({ profundidades: [{ referencia: 'PISCINA ADULTO', profundidadeMinM: EVID_NULL, profundidadeMaxM: EVID_OK(1.4, 'CORTE AA') }], niveis: [], detalhesConstrutivos: [], observacoes: [] }),
    ]);
    // tem área, lados e profundidade — mas volume NÃO foi escrito em lugar nenhum
    expect(c.corposDagua[0].volumeM3.status).toBe('NAO_IDENTIFICADO');
    expect(c.corposDagua[0].volumeM3.valor).toBeNull();
  });

  it('piscina adulto e infantil nunca se misturam', () => {
    const c = svc.consolidar([
      docArq({
        corposDagua: [
          { nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'PLANTA'), comprimentoM: EVID_NULL, larguraM: EVID_NULL, formato: EVID_NULL },
          { nome: 'Piscina Infantil', tipoCorpo: 'PISCINA_INFANTIL', areaM2: EVID_OK(25.4, 'PLANTA'), comprimentoM: EVID_NULL, larguraM: EVID_NULL, formato: EVID_NULL },
        ],
        deckAreaM2: EVID_NULL, sauna: EVID_NULL, bordaInfinita: EVID_NULL, revestimentos: [], observacoes: [],
      }),
      docCortes({
        profundidades: [
          { referencia: 'PISCINA ADULTO — CORTE AA', profundidadeMinM: EVID_NULL, profundidadeMaxM: EVID_OK(1.4, 'CORTE AA') },
          { referencia: 'PISCINA INFANTIL — CORTE BB', profundidadeMinM: EVID_NULL, profundidadeMaxM: EVID_OK(0.6, 'CORTE BB') },
        ],
        niveis: [], detalhesConstrutivos: [], observacoes: [],
      }),
    ]);

    expect(c.corposDagua).toHaveLength(2);
    const adulto = c.corposDagua.find((x) => x.tipoCorpo === 'PISCINA_ADULTO')!;
    const infantil = c.corposDagua.find((x) => x.tipoCorpo === 'PISCINA_INFANTIL')!;
    expect(adulto.profundidadeMaxM.valor).toBe(1.4);
    expect(infantil.profundidadeMaxM.valor).toBe(0.6);
    expect(adulto.areaM2.valor).toBe(41.4);
    expect(infantil.areaM2.valor).toBe(25.4);
  });

  it('documento DESCONHECIDO nunca é consolidado', () => {
    const c = svc.consolidar([
      { documentAnalysisId: 'dx', arquivoId: 'ax', nomeArquivo: 'misterio.pdf', documentType: 'DESCONHECIDO', extracao: { corposDagua: [{ nome: 'Fake', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(99, 'X') }] } },
    ]);
    expect(c.corposDagua).toHaveLength(0);
    expect(c.documentos[0].documentType).toBe('DESCONHECIDO');
  });
});
