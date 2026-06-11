import { Injectable, Logger } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import type { ChatMessage } from '../ai/ai.types';
import { limparJson } from './evidence.schema';
import { z } from 'zod';

/**
 * ETAPA 1 — CLASSIFICAÇÃO.
 * Todo PDF é classificado ANTES de qualquer extração, analisando:
 *  1. nome do arquivo          (sinal forte: "PROJ-HIDRAULICO-R02.pdf")
 *  2. carimbo / título da prancha / legenda (primeiras linhas do texto)
 *  3. conteúdo textual          (densidade de termos da disciplina)
 * Heurística determinística primeiro; IA só como desempate em ambiguidade.
 */

export interface Classificacao {
  documentType: DocumentType;
  confianca: number; // 0..1
  sinais: { nomeArquivo?: string; carimbo?: string; conteudo?: string; ia?: string };
}

/** Keywords por disciplina — ordem importa: disciplinas mais específicas primeiro. */
const KEYWORDS: { tipo: DocumentType; fortes: RegExp[]; conteudo: RegExp[] }[] = [
  {
    tipo: 'CASA_DE_MAQUINAS',
    fortes: [/casa\s*de\s*m[aá]quinas?/i, /\bcm\b.*piscina/i, /sala\s*de\s*bombas/i],
    conteudo: [/casa\s*de\s*m[aá]quinas?/gi, /layout.*bombas/gi, /barrilete/gi],
  },
  {
    tipo: 'MEMORIAL_DESCRITIVO',
    fortes: [/memorial/i, /especifica[cç][oõ]es\s*t[eé]cnicas/i],
    conteudo: [/memorial\s*descritivo/gi, /especifica[cç][aã]o/gi, /normas?\s*(abnt|nbr)/gi],
  },
  {
    tipo: 'EQUIPAMENTOS',
    fortes: [/equipamentos?/i, /lista\s*de\s*materia(l|is)/i, /quantitativo/i],
    conteudo: [/motobomba/gi, /filtro\s*[øo]?\s*\d/gi, /quadro\s*de\s*equipamentos/gi, /lista\s*de\s*materiais/gi],
  },
  {
    tipo: 'HIDRAULICO',
    fortes: [/hidr[aá]ulic[oa]/i, /\bhid\b/i, /tubula[cç][aã]o/i],
    conteudo: [/suc[cç][aã]o/gi, /retorno/gi, /skimmer/gi, /dreno\s*de\s*fundo/gi, /vaz[aã]o/gi, /dn\s*\d{2}/gi, /[øo]\s*\d{2}\s*mm/gi],
  },
  {
    tipo: 'ELETRICO',
    fortes: [/el[eé]tric[oa]/i, /\bele\b[-_.]/i, /ilumina[cç][aã]o/i],
    conteudo: [/circuito/gi, /disjuntor/gi, /quadro\s*el[eé]trico/gi, /transformador/gi, /cabo\s*\d/gi, /refletor/gi],
  },
  {
    tipo: 'CORTES',
    fortes: [/cortes?\b/i, /corte\s*[a-d][a-d]?/i, /se[cç][aã]o/i],
    conteudo: [/corte\s*[a-d][a-d]['']?/gi, /profundidade/gi, /n[ií]vel\s*d[''´]?[aá]gua/gi, /prof\.\s*\d/gi],
  },
  {
    tipo: 'DETALHES_EXECUTIVOS',
    fortes: [/detalhes?\s*(executivos?|construtivos?)/i, /\bdet\b[-_.]/i],
    conteudo: [/detalhe\s*\d/gi, /escala\s*1:2?5/gi, /impermeabiliza[cç][aã]o/gi],
  },
  {
    tipo: 'ESTRUTURAL',
    fortes: [/estrutural?/i, /forma\s*e\s*arma[cç][aã]o/i, /funda[cç][oõ]es?/i],
    conteudo: [/arma[cç][aã]o/gi, /a[cç]o\s*ca-?\d{2}/gi, /concreto\s*fck/gi, /laje/gi, /viga/gi, /ferragem/gi],
  },
  {
    tipo: 'IMPLANTACAO',
    fortes: [/implanta[cç][aã]o/i, /situa[cç][aã]o/i, /localiza[cç][aã]o/i],
    conteudo: [/implanta[cç][aã]o/gi, /lote/gi, /recuo/gi, /norte\s*magn[eé]tico/gi],
  },
  {
    tipo: 'PAISAGISMO',
    fortes: [/paisagism[oa]/i, /paisag[ií]stic[oa]/i],
    conteudo: [/esp[eé]cies?\s*vegeta(l|is)/gi, /forra[cç][aã]o/gi, /jardim/gi, /grama/gi],
  },
  {
    tipo: 'LAZER',
    fortes: [/lazer/i, /[aá]rea\s*de\s*lazer/i],
    conteudo: [/[aá]rea\s*de\s*lazer/gi, /deck/gi, /quiosque/gi, /churrasqueira/gi],
  },
  {
    tipo: 'ARQUITETONICO',
    fortes: [/arquitet[oô]nic[oa]/i, /\barq\b[-_.]/i, /planta\s*baixa/i, /layout/i],
    conteudo: [/planta\s*baixa/gi, /piscina/gi, /[aá]rea[:\s]*\d/gi, /revestimento/gi, /deck/gi],
  },
];

const ClassificacaoIaSchema = z.object({
  documentType: z.string(),
  confianca: z.number().min(0).max(1),
  justificativa: z.string().optional(),
});

const TIPOS_VALIDOS = new Set<string>(Object.values(DocumentType));

/**
 * Códigos de disciplina na nomenclatura técnica de prancha (ABNT/escritórios BR).
 * Ex.: "BOC-HID-EXE-12-PIS-R01" → HID = hidráulico. Token isolado entre -_. ou espaço.
 * Disciplina explícita tem prioridade sobre tipo de área (LAZ/PIS → arquitetônico).
 */
// Cada regex casa a ABREVIAÇÃO isolada (ARQ) OU a palavra completa (ARQUITETONICO).
const COD_DISCIPLINA: { re: RegExp; tipo: DocumentType; rotulo: string }[] = [
  { re: /(^|[-_. ])(arquitet\w*|arq)([-_. ]|$)/i, tipo: 'ARQUITETONICO', rotulo: 'ARQ' },
  { re: /(^|[-_. ])(hidr\w*|hid|hsa)([-_. ]|$)/i, tipo: 'HIDRAULICO', rotulo: 'HID' },
  { re: /(^|[-_. ])(eletr\w*|elet|ele|elt)([-_. ]|$)/i, tipo: 'ELETRICO', rotulo: 'ELE' },
  { re: /(^|[-_. ])(estrut\w*|est)([-_. ]|$)/i, tipo: 'ESTRUTURAL', rotulo: 'EST' },
  { re: /(^|[-_. ])(detalhe\w*|det)([-_. ]|$)/i, tipo: 'DETALHES_EXECUTIVOS', rotulo: 'DET' },
  { re: /(^|[-_. ])(cmaq|cm)([-_. ]|$)/i, tipo: 'CASA_DE_MAQUINAS', rotulo: 'CM' },
  { re: /(^|[-_. ])(implant\w*|impl|imp)([-_. ]|$)/i, tipo: 'IMPLANTACAO', rotulo: 'IMP' },
  { re: /(^|[-_. ])(paisag\w*|pai|paj)([-_. ]|$)/i, tipo: 'PAISAGISMO', rotulo: 'PAI' },
  { re: /(^|[-_. ])(memorial\w*|mem)([-_. ]|$)/i, tipo: 'MEMORIAL_DESCRITIVO', rotulo: 'MEM' },
  { re: /(^|[-_. ])(equip\w*|eqp|equi)([-_. ]|$)/i, tipo: 'EQUIPAMENTOS', rotulo: 'EQP' },
];
/** Tipo de ÁREA (sem disciplina explícita) → planta de lazer/piscina = arquitetônico. */
const COD_AREA = /(^|[-_. ])(laz|lazer|pis|piscina|pb|plb)([-_. ]|$)/i;

function classificarPorCodigoPrancha(nome: string): Classificacao | null {
  // 1º: disciplina explícita no código (sinal mais forte)
  for (const c of COD_DISCIPLINA) {
    if (c.re.test(nome)) {
      return { documentType: c.tipo, confianca: 0.9, sinais: { nomeArquivo: `código de prancha "${c.rotulo}" no nome` } };
    }
  }
  // 2º: tipo de área sem disciplina → arquitetônico/lazer
  if (COD_AREA.test(nome)) {
    return { documentType: 'ARQUITETONICO', confianca: 0.8, sinais: { nomeArquivo: 'prancha de lazer/piscina (sem disciplina explícita) → arquitetônico' } };
  }
  return null;
}

@Injectable()
export class DocumentClassifierService {
  private readonly logger = new Logger(DocumentClassifierService.name);

  constructor(private readonly ai: AiService) {}

  /**
   * Classifica por heurística (nome + carimbo + conteúdo). Se o sinal for fraco
   * ou ambíguo, usa IA como desempate — com a 1ª página como IMAGEM quando
   * disponível (carimbo e título da prancha são gráficos na maioria das plantas).
   */
  async classificar(tenantId: string, nomeArquivo: string, texto: string, primeiraPaginaImg?: string): Promise<Classificacao> {
    const heuristica = this.heuristica(nomeArquivo, texto);
    if (heuristica.confianca >= 0.75) return heuristica;

    // Sinal fraco → desempate por IA (texto curto e/ou 1ª página como imagem)
    try {
      const ia = await this.classificarPorIa(tenantId, nomeArquivo, texto, primeiraPaginaImg);
      if (ia && ia.confianca > heuristica.confianca) return ia;
    } catch (e) {
      this.logger.warn(`Classificação IA falhou (mantendo heurística): ${String(e)}`);
    }
    return heuristica;
  }

  /** Heurística determinística: nome do arquivo (peso 3) + carimbo (peso 2) + conteúdo (densidade). */
  heuristica(nomeArquivo: string, texto: string): Classificacao {
    const nome = nomeArquivo.toLowerCase();

    // SINAL DOMINANTE: código de disciplina na nomenclatura de prancha (ABNT/escritórios).
    // O conteúdo de uma planta de lazer cita sistemas de TODAS as disciplinas — por isso
    // o CÓDIGO no nome do arquivo é mais confiável que a densidade de termos.
    const porCodigo = classificarPorCodigoPrancha(nome);
    if (porCodigo) return porCodigo;

    // Carimbo/título da prancha: primeiras 50 linhas concentram legenda e carimbo
    const carimbo = texto.split('\n').slice(0, 50).join('\n');
    const scores = new Map<DocumentType, { score: number; sinais: Classificacao['sinais'] }>();

    for (const k of KEYWORDS) {
      let score = 0;
      const sinais: Classificacao['sinais'] = {};

      for (const re of k.fortes) {
        if (re.test(nome)) { score += 3; sinais.nomeArquivo = `"${nomeArquivo}" casa com ${re}`; break; }
      }
      for (const re of k.fortes) {
        if (re.test(carimbo)) { score += 2; sinais.carimbo = `carimbo/título casa com ${re}`; break; }
      }
      let hits = 0;
      for (const re of k.conteudo) hits += (texto.match(re) ?? []).length;
      if (hits > 0) { score += Math.min(2, hits / 4); sinais.conteudo = `${hits} ocorrências de termos da disciplina`; }

      if (score > 0) scores.set(k.tipo, { score, sinais });
    }

    if (scores.size === 0) {
      return { documentType: 'DESCONHECIDO', confianca: 0, sinais: {} };
    }

    const ordenado = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
    const [tipo, top] = ordenado[0];
    const segundo = ordenado[1]?.[1].score ?? 0;
    // Confiança: score absoluto + distância para o 2º colocado
    const confianca = Math.min(0.97, top.score / 7 + (top.score - segundo) * 0.08);
    return { documentType: tipo, confianca: Math.max(0.1, confianca), sinais: top.sinais };
  }

  private async classificarPorIa(tenantId: string, nomeArquivo: string, texto: string, primeiraPaginaImg?: string): Promise<Classificacao | null> {
    const tipos = Object.values(DocumentType).join(' | ');
    const system =
      `Você classifica documentos de projetos de piscina/construção em UMA disciplina.\n` +
      `Tipos possíveis: ${tipos}\n` +
      `Analise o NOME DO ARQUIVO, o CARIMBO/TÍTULO DA PRANCHA (canto inferior direito na maioria das pranchas) e o CONTEÚDO.\n` +
      `Se não houver evidência clara, use DESCONHECIDO com confiança baixa.\n` +
      `Responda APENAS JSON: {"documentType": string, "confianca": number 0..1, "justificativa": string}`;

    const textoUser = `ARQUIVO: ${nomeArquivo}\n\nCONTEÚDO (início):\n"""\n${texto.slice(0, 3000)}\n"""`;
    const content: ChatMessage['content'] = primeiraPaginaImg
      ? [
          { type: 'text', text: `${textoUser}\n\nA imagem anexa é a 1ª página da prancha — use o carimbo/título visual.` },
          { type: 'image_url', image_url: { url: primeiraPaginaImg, detail: 'low' } },
        ]
      : textoUser;

    const res = await this.ai.complete(
      tenantId,
      [{ role: 'system', content: system }, { role: 'user', content }],
      { jsonMode: true, temperature: 0 },
    );
    const parsed = ClassificacaoIaSchema.parse(limparJson(res.content));
    const tipo = TIPOS_VALIDOS.has(parsed.documentType) ? (parsed.documentType as DocumentType) : 'DESCONHECIDO';
    return { documentType: tipo, confianca: parsed.confianca, sinais: { ia: parsed.justificativa ?? 'classificado por IA' } };
  }
}
