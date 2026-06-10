import { Injectable } from '@nestjs/common';
import type { Achado, Consolidacao, ResultadoValidacao, ResumoTecnico } from './consolidation.types';
import type { CampoConsolidado } from './evidence.schema';

/**
 * ETAPA 7 — VALIDAÇÃO TÉCNICA.
 * Regras (do briefing):
 *  - piscina sem área           → PENDÊNCIA
 *  - hidráulica sem bomba       → PENDÊNCIA
 *  - valor sem fonte            → ERRO (violação do sistema de evidências)
 *  - profundidade sem corte     → PENDÊNCIA
 *  - conflito entre disciplinas → PENDÊNCIA
 *  - documento DESCONHECIDO     → PENDÊNCIA (classificação manual)
 *  - extração com falha         → PENDÊNCIA
 * Aprovado = zero erros E zero pendências.
 */
@Injectable()
export class ProjectValidationService {
  validar(c: Consolidacao): ResultadoValidacao {
    const erros: Achado[] = [];
    const pendencias: Achado[] = [];

    // ── Integridade de evidência: valor sem fonte = ERRO ─────────────────────
    const verificarEvidencia = (campo: CampoConsolidado, nome: string, alvo: string) => {
      if (campo.valor !== null && campo.fontes.length === 0) {
        erros.push({ nivel: 'ERRO', codigo: 'VALOR_SEM_FONTE', alvo, mensagem: `${nome} de "${alvo}" tem valor sem nenhuma evidência — violação do sistema de evidências.` });
      }
    };

    // ── Corpos d'água ─────────────────────────────────────────────────────────
    if (c.corposDagua.length === 0) {
      pendencias.push({ nivel: 'PENDENCIA', codigo: 'NENHUM_CORPO_DAGUA', mensagem: 'Nenhuma piscina/corpo d\'água identificado nos documentos. Anexe a planta arquitetônica (planta baixa).' });
    }

    for (const corpo of c.corposDagua) {
      verificarEvidencia(corpo.areaM2, 'Área', corpo.nome);
      verificarEvidencia(corpo.volumeM3, 'Volume', corpo.nome);
      verificarEvidencia(corpo.profundidadeMaxM, 'Profundidade', corpo.nome);

      const temArea = corpo.areaM2.status === 'CONFIRMADO';
      const temLados = corpo.comprimentoM.status === 'CONFIRMADO' && corpo.larguraM.status === 'CONFIRMADO';
      if (!temArea && !temLados) {
        pendencias.push({ nivel: 'PENDENCIA', codigo: 'PISCINA_SEM_AREA', alvo: corpo.nome, mensagem: `"${corpo.nome}" sem área nem dimensões cotadas em nenhum documento. Verifique a planta arquitetônica.` });
      }
      if (corpo.profundidadeMaxM.status === 'NAO_IDENTIFICADO' && corpo.profundidadeMinM.status === 'NAO_IDENTIFICADO') {
        pendencias.push({ nivel: 'PENDENCIA', codigo: 'PROFUNDIDADE_SEM_CORTE', alvo: corpo.nome, mensagem: `"${corpo.nome}" sem profundidade evidenciada. Anexe a prancha de cortes/seções (cota vertical).` });
      }
    }

    // ── Hidráulica presente sem bomba ────────────────────────────────────────
    const temHidraulico = c.disciplinasPresentes.includes('HIDRAULICO');
    const temBomba = c.equipamentos.some((e) => e.categoria === 'BOMBA');
    if (temHidraulico && !temBomba) {
      pendencias.push({ nivel: 'PENDENCIA', codigo: 'HIDRAULICA_SEM_BOMBA', mensagem: 'Projeto hidráulico analisado mas nenhuma bomba evidenciada. Verifique o quadro de equipamentos da prancha hidráulica.' });
    }

    // ── Conflitos entre disciplinas ──────────────────────────────────────────
    for (const conflito of c.conflitos) {
      const valores = conflito.valores.map((v) => `${v.documento}: ${String(v.valor)}`).join(' ≠ ');
      pendencias.push({ nivel: 'PENDENCIA', codigo: 'CONFLITO_ENTRE_DOCUMENTOS', alvo: conflito.alvo, mensagem: `Conflito em ${conflito.campo} de "${conflito.alvo}" (${valores}). Resolva manualmente indicando o valor correto.` });
    }

    // ── Documentos não classificados ou com falha ────────────────────────────
    for (const doc of c.documentos) {
      if (doc.documentType === 'DESCONHECIDO') {
        pendencias.push({ nivel: 'PENDENCIA', codigo: 'DOCUMENTO_NAO_CLASSIFICADO', alvo: doc.nomeArquivo, mensagem: `"${doc.nomeArquivo}" não pôde ser classificado em nenhuma disciplina. Classifique manualmente para que seja lido.` });
      } else if (doc.comErro) {
        pendencias.push({ nivel: 'PENDENCIA', codigo: 'EXTRACAO_FALHOU', alvo: doc.nomeArquivo, mensagem: `A leitura de "${doc.nomeArquivo}" falhou ou não retornou dados. Verifique a qualidade do PDF.` });
      }
    }

    // ── Quantidades de equipamentos sem evidência (valor preenchido sem fonte) ─
    for (const eq of c.equipamentos) {
      verificarEvidencia(eq.quantidade, 'Quantidade', `${eq.categoria} ${eq.descricao ?? eq.modelo ?? ''}`.trim());
    }

    return { erros, pendencias, aprovado: erros.length === 0 && pendencias.length === 0 };
  }

  /** ETAPA 8 — Resumo técnico legível para confirmação humana. */
  gerarResumo(c: Consolidacao, validacao: ResultadoValidacao): ResumoTecnico {
    const fmtNum = (campo: CampoConsolidado<number>, unidade: string): string => {
      if (campo.status === 'CONFLITO') return 'CONFLITO — resolver';
      if (campo.status === 'NAO_IDENTIFICADO' || campo.valor === null) return 'não identificado';
      return `${campo.valor}${unidade}`;
    };

    return {
      corposDagua: c.corposDagua.map((corpo) => ({
        nome: corpo.nome,
        tipo: corpo.tipoCorpo,
        area: fmtNum(corpo.areaM2, 'm²'),
        profundidade: corpo.profundidadeMinM.valor !== null && corpo.profundidadeMaxM.valor !== null && corpo.profundidadeMinM.valor !== corpo.profundidadeMaxM.valor
          ? `${corpo.profundidadeMinM.valor}m a ${corpo.profundidadeMaxM.valor}m`
          : fmtNum(corpo.profundidadeMaxM.valor !== null ? corpo.profundidadeMaxM : corpo.profundidadeMinM, 'm'),
        volume: fmtNum(corpo.volumeM3, 'm³'),
      })),
      sistemas: c.sistemas.map((s) => s.sistema),
      equipamentos: c.equipamentos.map((e) => ({
        categoria: e.categoria,
        descricao: e.descricao ?? e.modelo ?? '—',
        quantidade: e.quantidade.valor !== null ? String(e.quantidade.valor) : 'não identificada',
      })),
      deck: fmtNum(c.deckAreaM2, 'm²'),
      sauna: c.sauna.valor === true ? 'sim' : c.sauna.valor === false ? 'não' : 'não identificado',
      documentosLidos: c.documentos.map((d) => ({ arquivo: d.nomeArquivo, disciplina: d.documentType })),
      pendencias: validacao.pendencias.map((p) => p.mensagem),
      erros: validacao.erros.map((e) => e.mensagem),
    };
  }
}
