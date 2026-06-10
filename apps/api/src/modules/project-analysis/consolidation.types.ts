import type { DocumentType } from '@prisma/client';
import type { CampoConsolidado } from './evidence.schema';
import type { CorpoTipo } from './extraction.schemas';

/**
 * ETAPA 3/4 — PROJETO CONSOLIDADO.
 * Estruturas da consolidação: cada campo carrega TODAS as fontes que o sustentam.
 * Divergência entre disciplinas → status CONFLITO (nunca sobrescrever).
 */

export interface DocumentoAnalisado {
  documentAnalysisId: string;
  arquivoId: string;
  nomeArquivo: string;
  documentType: DocumentType;
  extracao: unknown | null;
  erro?: string | null;
}

export interface CorpoConsolidado {
  nome: string;
  tipoCorpo: CorpoTipo;
  areaM2: CampoConsolidado<number>;
  comprimentoM: CampoConsolidado<number>;
  larguraM: CampoConsolidado<number>;
  profundidadeMinM: CampoConsolidado<number>;
  profundidadeMaxM: CampoConsolidado<number>;
  /** Volume NUNCA é calculado — só existe se escrito em documento (memorial). */
  volumeM3: CampoConsolidado<number>;
  formato: CampoConsolidado<string>;
}

export interface EquipamentoConsolidado {
  categoria: string;
  descricao: string | null;
  modelo: string | null;
  quantidade: CampoConsolidado<number>;
  especificacao: string | null;
  fontes: { documento: string; documentType: string; fonte: string; pagina: number | null }[];
}

export interface SistemaConsolidado {
  /** FILTRAGEM | LED | AQUECIMENTO | HIDROMASSAGEM | CASCATA | BORDA_INFINITA | PRAINHA | SPA | SAUNA | TRATAMENTO */
  sistema: string;
  fontes: { documento: string; documentType: string; fonte: string; pagina: number | null }[];
}

export interface Consolidacao {
  corposDagua: CorpoConsolidado[];
  equipamentos: EquipamentoConsolidado[];
  sistemas: SistemaConsolidado[];
  deckAreaM2: CampoConsolidado<number>;
  sauna: CampoConsolidado<boolean>;
  bordaInfinita: CampoConsolidado<boolean>;
  revestimentos: { local: string; descricao: string; documento: string; fonte: string; pagina: number | null }[];
  disciplinasPresentes: DocumentType[];
  documentos: { nomeArquivo: string; documentType: DocumentType; comErro: boolean }[];
  conflitos: { campo: string; alvo: string; valores: { documento: string; valor: unknown }[] }[];
}

// ── ETAPA 7 — VALIDAÇÃO ──────────────────────────────────────────────────────

export type AchadoNivel = 'ERRO' | 'PENDENCIA';

export interface Achado {
  nivel: AchadoNivel;
  codigo: string;       // ex.: PISCINA_SEM_AREA, VOLUME_SEM_FONTE, HIDRAULICA_SEM_BOMBA
  mensagem: string;
  alvo?: string;        // ex.: nome do corpo d'água ou documento
}

export interface ResultadoValidacao {
  erros: Achado[];
  pendencias: Achado[];
  aprovado: boolean;
}

// ── ETAPA 8 — RESUMO PARA CONFIRMAÇÃO HUMANA ────────────────────────────────

export interface ResumoTecnico {
  corposDagua: { nome: string; tipo: string; area: string; profundidade: string; volume: string }[];
  sistemas: string[];
  equipamentos: { categoria: string; descricao: string; quantidade: string }[];
  deck: string;
  sauna: string;
  documentosLidos: { arquivo: string; disciplina: string }[];
  pendencias: string[];
  erros: string[];
}
