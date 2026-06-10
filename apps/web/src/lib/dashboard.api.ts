import { api } from './api';

export interface Operacional {
  // financeiro
  valorOrcadoMes: number;
  pipelineValor: number;
  aprovadoValorMes: number;
  ticketMedio: number;
  taxaConversao: number; // 0..1
  tempoMedioMin: number | null;
  // volume
  orcamentosHoje: number;
  orcamentosMes: number;
  aguardandoRevisao: number;
  aprovados: number;
  enviados: number;
  // funil comercial
  funil: { obras: number; leiturasIa: number; dimensionamentos: number; orcamentos: number; enviados: number; aprovados: number };
  // distribuição
  porStatus: { status: string; total: number; valor: number }[];
  // tendência
  tendencia: { mes: string; total: number; valor: number }[];
  // rankings
  ranking: { nome: string; valor: number }[];
  topClientes: { nome: string; valor: number }[];
  // impacto da IA
  ia: { itensIa: number; itensRegra: number; itensManual: number; correcoes: number };
  // precisa de atenção
  atencao: { revisaoParada: number; obrasSemOrcamento: number; leiturasRevisar: number };
}

export interface Executivo {
  valorOrcadoMes: number;
  tempoMedioMin: number | null;
  tendencia: { mes: string; total: number; valor: number }[];
  porCidade: { cidade: string; total: number }[];
  equipamentos: { item: string; total: number }[];
  fabricantes: { fabricante: string; total: number }[];
}

export const dashboardApi = {
  operacional: () => api<Operacional>('/dashboard/operacional'),
  executivo: () => api<Executivo>('/dashboard/executivo'),
};
