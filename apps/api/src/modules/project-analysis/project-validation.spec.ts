import { ProjectValidationService } from './project-validation.service';
import { ProjectConsolidatorService } from './project-consolidator.service';
import { campoVazio } from './evidence.schema';
import type { Consolidacao, DocumentoAnalisado } from './consolidation.types';

const EVID_OK = (valor: number | string | boolean, fonte: string) => ({ valor, fonte, pagina: 1, status: 'CONFIRMADO' as const });
const EVID_NULL = { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' as const };

function consolidacaoVazia(): Consolidacao {
  return {
    corposDagua: [], equipamentos: [], sistemas: [],
    deckAreaM2: campoVazio(), sauna: campoVazio(), bordaInfinita: campoVazio(),
    revestimentos: [], disciplinasPresentes: [], documentos: [], conflitos: [],
  };
}

describe('ProjectValidationService (ETAPA 7)', () => {
  const svc = new ProjectValidationService();
  const consolidator = new ProjectConsolidatorService();

  it('nenhum corpo d\'água → pendência NENHUM_CORPO_DAGUA', () => {
    const r = svc.validar(consolidacaoVazia());
    expect(r.aprovado).toBe(false);
    expect(r.pendencias.some((p) => p.codigo === 'NENHUM_CORPO_DAGUA')).toBe(true);
  });

  it('piscina sem área → pendência PISCINA_SEM_AREA', () => {
    const c = consolidacaoVazia();
    c.corposDagua.push({
      nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO',
      areaM2: campoVazio(), comprimentoM: campoVazio(), larguraM: campoVazio(),
      profundidadeMinM: campoVazio(), profundidadeMaxM: campoVazio(),
      volumeM3: campoVazio(), formato: campoVazio(),
    });
    const r = svc.validar(c);
    expect(r.pendencias.some((p) => p.codigo === 'PISCINA_SEM_AREA' && p.alvo === 'Piscina Adulto')).toBe(true);
    expect(r.pendencias.some((p) => p.codigo === 'PROFUNDIDADE_SEM_CORTE')).toBe(true);
    expect(r.aprovado).toBe(false);
  });

  it('hidráulica presente sem bomba → pendência HIDRAULICA_SEM_BOMBA', () => {
    const c = consolidacaoVazia();
    c.disciplinasPresentes.push('HIDRAULICO');
    const r = svc.validar(c);
    expect(r.pendencias.some((p) => p.codigo === 'HIDRAULICA_SEM_BOMBA')).toBe(true);
  });

  it('valor sem fonte → ERRO VALOR_SEM_FONTE (violação do sistema de evidências)', () => {
    const c = consolidacaoVazia();
    c.corposDagua.push({
      nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO',
      areaM2: { valor: 41.4, fontes: [], status: 'CONFIRMADO' }, // valor órfão — proibido
      comprimentoM: campoVazio(), larguraM: campoVazio(),
      profundidadeMinM: campoVazio(), profundidadeMaxM: campoVazio(),
      volumeM3: campoVazio(), formato: campoVazio(),
    });
    const r = svc.validar(c);
    expect(r.erros.some((e) => e.codigo === 'VALOR_SEM_FONTE')).toBe(true);
    expect(r.aprovado).toBe(false);
  });

  it('conflito entre documentos → pendência CONFLITO_ENTRE_DOCUMENTOS', () => {
    const c = consolidacaoVazia();
    c.conflitos.push({ campo: 'areaM2', alvo: 'Piscina Adulto', valores: [{ documento: 'ARQ.pdf', valor: 41.4 }, { documento: 'MEMORIAL.pdf', valor: 50 }] });
    const r = svc.validar(c);
    expect(r.pendencias.some((p) => p.codigo === 'CONFLITO_ENTRE_DOCUMENTOS')).toBe(true);
  });

  it('documento DESCONHECIDO → pendência DOCUMENTO_NAO_CLASSIFICADO', () => {
    const c = consolidacaoVazia();
    c.documentos.push({ nomeArquivo: 'misterio.pdf', documentType: 'DESCONHECIDO', comErro: false });
    const r = svc.validar(c);
    expect(r.pendencias.some((p) => p.codigo === 'DOCUMENTO_NAO_CLASSIFICADO')).toBe(true);
  });

  it('projeto completo e coerente → aprovado, e gera resumo técnico correto (ETAPA 8)', () => {
    const docs: DocumentoAnalisado[] = [
      {
        documentAnalysisId: 'd1', arquivoId: 'a1', nomeArquivo: 'ARQ.pdf', documentType: 'ARQUITETONICO',
        extracao: {
          corposDagua: [{ nome: 'Piscina Adulto', tipoCorpo: 'PISCINA_ADULTO', areaM2: EVID_OK(41.4, 'PLANTA BAIXA'), comprimentoM: EVID_NULL, larguraM: EVID_NULL, formato: EVID_NULL }],
          deckAreaM2: EVID_OK(65.8, 'PLANTA BAIXA'), sauna: EVID_OK(true, 'PLANTA BAIXA'), bordaInfinita: EVID_NULL, revestimentos: [], observacoes: [],
        },
      },
      {
        documentAnalysisId: 'd2', arquivoId: 'a2', nomeArquivo: 'CORTES.pdf', documentType: 'CORTES',
        extracao: { profundidades: [{ referencia: 'PISCINA ADULTO — CORTE AA', profundidadeMinM: EVID_NULL, profundidadeMaxM: EVID_OK(1.4, 'CORTE AA') }], niveis: [], detalhesConstrutivos: [], observacoes: [] },
      },
    ];
    const c = consolidator.consolidar(docs);
    const r = svc.validar(c);
    expect(r.erros).toHaveLength(0);
    expect(r.pendencias).toHaveLength(0);
    expect(r.aprovado).toBe(true);

    const resumo = svc.gerarResumo(c, r);
    expect(resumo.corposDagua[0].area).toBe('41.4m²');
    expect(resumo.corposDagua[0].profundidade).toBe('1.4m');
    expect(resumo.corposDagua[0].volume).toBe('não identificado'); // nunca calculado
    expect(resumo.sauna).toBe('sim');
    expect(resumo.deck).toBe('65.8m²');
    expect(resumo.documentosLidos).toHaveLength(2);
  });
});
