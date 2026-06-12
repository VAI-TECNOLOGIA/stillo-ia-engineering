import { api } from './api';
import { clientesApi, type Cliente } from './clientes.api';
import type { Obra } from './obras.api';

/**
 * Client do MOTOR DE LEITURA v2 (ProjectAnalysis) — fluxo REAL:
 * upload → disparar (classifica + consenso 3-IA + consolida + valida) →
 * resolver pendências (vira evidência CONFIRMACAO_HUMANA) → confirmar →
 * libera o orçamento. Tipos espelham `consolidation.types.ts` do backend.
 */

export interface FonteEvid {
  documento: string;
  documentType: string;
  fonte: string;
  pagina: number | null;
  valor: unknown;
}

export interface CampoEvid<T = number> {
  valor: T | null;
  fontes: FonteEvid[];
  status: 'CONFIRMADO' | 'NAO_IDENTIFICADO' | 'CONFLITO';
}

export interface CorpoDagua {
  nome: string;
  tipoCorpo?: string;
  formato?: CampoEvid<string>;
  areaM2: CampoEvid;
  comprimentoM: CampoEvid;
  larguraM: CampoEvid;
  profundidadeMinM: CampoEvid;
  profundidadeMaxM: CampoEvid;
  volumeM3: CampoEvid;
}

export interface ConsolidacaoV2 {
  corposDagua: CorpoDagua[];
  sistemas: unknown[];
  equipamentos: unknown[];
  conflitos: { alvo: string; campo: string }[];
  disciplinasPresentes: string[];
}

export interface Achado {
  alvo: string;
  nivel: 'PENDENCIA' | 'ERRO';
  codigo: string;
  mensagem: string;
}

export interface ValidacaoV2 {
  aprovado: boolean;
  erros: Achado[];
  pendencias: Achado[];
}

/** Rastro do consenso entre IAs anexado à extração de cada documento. */
export interface ConsensoCampoInfo {
  campo: string;   // ex.: "PISCINA_ADULTO.areaM2"
  status: 'CONSENSO' | 'MAIORIA' | 'DIVERGENTE' | 'LIDO_POR_UMA' | 'NAO_LIDO';
  valor: number | null;
  leram: number;
  concordam: number;
  /** O que cada IA respondeu (rastreabilidade; em LIDO_POR_UMA traz o único valor lido). */
  votos?: { provider: string; valor: number | null }[];
}

export interface ConsensoInfo {
  providersUsados: string[];
  aprovado: boolean;
  confirmados: number;
  notificacoes: string[];
  campos: ConsensoCampoInfo[];
  porProvider: { provider: string; ok: boolean; erro: string | null }[];
}

export interface DocAnaliseV2 {
  id: string;
  documentType: string;
  status: 'PENDENTE' | 'CLASSIFICANDO' | 'CLASSIFICADO' | 'EXTRAINDO' | 'EXTRAIDO' | 'FALHA';
  modeloIa: string | null;
  erro: string | null;
  extracao: { __consenso?: ConsensoInfo } & Record<string, unknown>;
  arquivo: { id: string; nomeOriginal: string };
}

export type AnaliseStatus = 'EM_ANALISE' | 'COM_PENDENCIAS' | 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO' | 'FALHA';

export interface ProjectAnalysisV2 {
  id: string;
  obraId: string;
  status: AnaliseStatus;
  consolidacao: ConsolidacaoV2 | null;
  validacao: ValidacaoV2 | null;
  resumo: unknown;
  erro: string | null;
  analises: DocAnaliseV2[];
}

export type CampoResolvivel = 'areaM2' | 'comprimentoM' | 'larguraM' | 'profundidadeMinM' | 'profundidadeMaxM' | 'volumeM3';

const CLIENTE_RAPIDO = 'Orçamentos Rápidos (Novo Orçamento)';

export const analiseApi = {
  /** Reusa (ou cria) o cliente-pasta dos orçamentos iniciados pela tela Novo Orçamento. */
  async garantirClienteRapido(): Promise<Cliente> {
    const { items } = await clientesApi.list({ q: CLIENTE_RAPIDO, limit: 1 });
    if (items[0]) return items[0];
    return clientesApi.create({ nome: CLIENTE_RAPIDO, observacoes: 'Criado automaticamente pela tela Novo Orçamento com IA.' });
  },

  criarObraRapida(clienteId: string, nome: string): Promise<Obra> {
    return api<Obra>('/obras', { method: 'POST', body: JSON.stringify({ clienteId, nome }) });
  },

  atualizarObra(obraId: string, dados: { cidade?: string; uf?: string; observacoes?: string }): Promise<Obra> {
    return api<Obra>(`/obras/${obraId}`, { method: 'PATCH', body: JSON.stringify(dados) });
  },

  /** Dispara a análise v2 — SÍNCRONA no backend (consenso 3-IA): 1–3 min por documento. */
  disparar(obraId: string): Promise<ProjectAnalysisV2> {
    return api<ProjectAnalysisV2>(`/obras/${obraId}/analise-projeto`, { method: 'POST' });
  },

  obter(obraId: string): Promise<ProjectAnalysisV2 | null> {
    return api<ProjectAnalysisV2 | null>(`/obras/${obraId}/analise-projeto`);
  },

  /** Resolve pendência/divergência: o valor humano vira evidência CONFIRMACAO_HUMANA. */
  resolver(analiseId: string, dto: { alvo: string; campo: CampoResolvivel; valor: number; justificativa?: string }): Promise<ProjectAnalysisV2> {
    return api<ProjectAnalysisV2>(`/analises-projeto/${analiseId}/resolver`, { method: 'PATCH', body: JSON.stringify(dto) });
  },

  /** ETAPA 8 — só passa com validação 100% limpa; senão 400 BLOQUEADO + pendências. */
  confirmar(analiseId: string): Promise<ProjectAnalysisV2> {
    return api<ProjectAnalysisV2>(`/analises-projeto/${analiseId}/confirmar`, { method: 'POST' });
  },
};
