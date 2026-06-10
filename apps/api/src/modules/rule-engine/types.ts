/**
 * Tipos do Motor de Regras (domínio puro — sem dependência de framework/banco).
 * Ver docs/04-MOTOR-DE-REGRAS.md
 */

export type Operador =
  | '=' | '!=' | '>' | '>=' | '<' | '<='
  | 'in' | 'contem' | 'entre';

/** Condição (QUANDO) — combinável e aninhável. */
export type Condicao =
  | { todas: Condicao[] }              // AND
  | { alguma: Condicao[] }             // OR
  | { nao: Condicao }                  // NOT
  | { fato: string; op: Operador; valor: unknown };

/** Ações (ENTÃO). */
export type Acao =
  | {
      tipo: 'ADICIONAR_ITEM';
      categoria: string;
      descricao: string;
      /** Número literal ou expressão segura, ex.: "teto(piscina.perimetroM / 1.5)". */
      quantidade: number | string;
      unidade?: string;
      criterioProduto?: Record<string, unknown>;
    }
  | { tipo: 'DEFINIR_ATRIBUTO'; chave: string; valor: number | string }
  | { tipo: 'EXIGIR_PRODUTO'; categoria: string; criterioProduto?: Record<string, unknown> }
  | { tipo: 'AVISO'; mensagem: string };

/** Estrutura de uma regra avaliável. */
export interface RegraAvaliavel {
  id: string;
  nome: string;
  categoria: string;
  prioridade: number;
  ativo: boolean;
  quando: Condicao;
  entao: Acao[];
}

/** Conjunto de fatos achatados (ex.: { "piscina.perimetroM": 24, "piscina.sistemas": ["LED"] }). */
export type Fatos = Record<string, unknown>;

/** Item técnico produzido pela avaliação. */
export interface ItemDimensionado {
  categoria: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  regraId: string;
  criterioProduto?: Record<string, unknown>;
  /** Trilha de explicação: expressão e fatos usados. */
  explicacao: {
    regraNome: string;
    expressaoQuantidade: string;
    fatosUsados: Fatos;
  };
}

export interface ResultadoAvaliacao {
  itens: ItemDimensionado[];
  avisos: string[];
  atributos: Record<string, number | string>;
  /** IDs das regras que dispararam (auditoria). */
  regrasDisparadas: string[];
}
