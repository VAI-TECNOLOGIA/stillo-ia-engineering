import { z } from 'zod';
import { EvidBool, EvidNumero, EvidTexto } from './evidence.schema';

/**
 * ETAPA 2 — SCHEMAS DE EXTRAÇÃO POR DISCIPLINA.
 * Cada extrator só pode devolver os campos da SUA disciplina.
 * Todo campo é uma Evidência: { valor, fonte, pagina, status }.
 * Inferência é bloqueada no parse (ver evidence.schema.ts).
 */

export const CorpoTipoEnum = z.enum([
  'PISCINA_ADULTO', 'PISCINA_INFANTIL', 'SPA', 'PRAINHA', 'ESPELHO_DAGUA', 'DESCONHECIDO',
]);
export type CorpoTipo = z.infer<typeof CorpoTipoEnum>;

// ── ARQUITETÔNICO (também IMPLANTACAO / LAZER / PAISAGISMO) ──────────────────
// Extrai: piscinas, áreas, spa, sauna, prainha, deck, bordas, revestimentos.
// NUNCA extrai: bomba, filtro, vazão, potência, profundidade (vem de CORTES).
export const ExtracaoArquitetonicaSchema = z.object({
  disciplina: z.literal('ARQUITETONICO').default('ARQUITETONICO'),
  corposDagua: z.array(z.object({
    nome: z.string(),
    tipoCorpo: CorpoTipoEnum.default('DESCONHECIDO'),
    areaM2: EvidNumero,
    comprimentoM: EvidNumero,
    larguraM: EvidNumero,
    formato: EvidTexto,
  })).default([]),
  deckAreaM2: EvidNumero,
  sauna: EvidBool,
  bordaInfinita: EvidBool,
  revestimentos: z.array(z.object({
    local: z.string(),
    descricao: z.string(),
    fonte: z.string(),
    pagina: z.number().int().positive().nullable().default(null),
  })).default([]),
  observacoes: z.array(z.string()).default([]),
});

// ── HIDRÁULICO ───────────────────────────────────────────────────────────────
// Extrai: sucção, retorno, tubulação, aquecimento, bombas, filtros, vazões, diâmetros.
// NUNCA inventa área/dimensão de piscina.
export const ExtracaoHidraulicaSchema = z.object({
  disciplina: z.literal('HIDRAULICO').default('HIDRAULICO'),
  bombas: z.array(z.object({
    descricao: EvidTexto,
    potenciaCv: EvidNumero,
    vazaoM3h: EvidNumero,
    quantidade: EvidNumero,
  })).default([]),
  filtros: z.array(z.object({
    descricao: EvidTexto,
    diametroMm: EvidNumero,
    quantidade: EvidNumero,
  })).default([]),
  tubulacoes: z.array(z.object({
    funcao: z.enum(['SUCCAO', 'RETORNO', 'ASPIRACAO', 'DRENO', 'HIDROMASSAGEM', 'EXTRAVASOR', 'OUTRO']).default('OUTRO'),
    diametro: EvidTexto,
    material: EvidTexto,
  })).default([]),
  dispositivos: z.array(z.object({
    tipo: z.enum(['SKIMMER', 'DRENO_FUNDO', 'DISPOSITIVO_RETORNO', 'BOCA_ASPIRACAO', 'BORDA_CALHA', 'OUTRO']).default('OUTRO'),
    quantidade: EvidNumero,
  })).default([]),
  aquecimento: z.object({
    existe: EvidBool,
    tipo: EvidTexto,
    potencia: EvidNumero,
  }).default({
    existe: { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' },
    tipo: { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' },
    potencia: { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' },
  }),
  observacoes: z.array(z.string()).default([]),
});

// ── ELÉTRICO ─────────────────────────────────────────────────────────────────
export const ExtracaoEletricaSchema = z.object({
  disciplina: z.literal('ELETRICO').default('ELETRICO'),
  iluminacao: z.array(z.object({
    tipo: EvidTexto,
    quantidade: EvidNumero,
    potenciaW: EvidNumero,
  })).default([]),
  circuitos: z.array(z.object({
    descricao: EvidTexto,
    disjuntor: EvidTexto,
  })).default([]),
  transformadores: z.array(z.object({
    descricao: EvidTexto,
    potenciaVa: EvidNumero,
  })).default([]),
  observacoes: z.array(z.string()).default([]),
});

// ── CORTES / DETALHES EXECUTIVOS ────────────────────────────────────────────
// Única disciplina autorizada a extrair PROFUNDIDADES (cotas de corte).
export const ExtracaoCortesSchema = z.object({
  disciplina: z.literal('CORTES').default('CORTES'),
  profundidades: z.array(z.object({
    referencia: z.string(), // ex.: "PISCINA ADULTO — CORTE AA"
    profundidadeMinM: EvidNumero,
    profundidadeMaxM: EvidNumero,
  })).default([]),
  niveis: z.array(z.object({ descricao: EvidTexto })).default([]),
  detalhesConstrutivos: z.array(z.object({
    descricao: z.string(),
    fonte: z.string(),
    pagina: z.number().int().positive().nullable().default(null),
  })).default([]),
  observacoes: z.array(z.string()).default([]),
});

// ── EQUIPAMENTOS / CASA DE MÁQUINAS ─────────────────────────────────────────
export const ExtracaoEquipamentosSchema = z.object({
  disciplina: z.literal('EQUIPAMENTOS').default('EQUIPAMENTOS'),
  equipamentos: z.array(z.object({
    categoria: z.enum(['BOMBA', 'FILTRO', 'AQUECEDOR', 'TROCADOR_CALOR', 'CLORADOR', 'DOSADORA', 'LED', 'AUTOMACAO', 'OUTRO']).default('OUTRO'),
    descricao: EvidTexto,
    modelo: EvidTexto,
    quantidade: EvidNumero,
    especificacao: EvidTexto,
  })).default([]),
  observacoes: z.array(z.string()).default([]),
});

// ── ESTRUTURAL ───────────────────────────────────────────────────────────────
export const ExtracaoEstruturalSchema = z.object({
  disciplina: z.literal('ESTRUTURAL').default('ESTRUTURAL'),
  elementos: z.array(z.object({
    tipo: EvidTexto,        // ex.: "laje de fundo", "parede de concreto armado"
    especificacao: EvidTexto,
  })).default([]),
  concretoFck: EvidNumero,
  impermeabilizacao: EvidTexto,
  observacoes: z.array(z.string()).default([]),
});

// ── MEMORIAL DESCRITIVO ──────────────────────────────────────────────────────
// Memorial cita áreas/volumes/sistemas EXPLÍCITOS em texto — evidência válida.
export const ExtracaoMemorialSchema = z.object({
  disciplina: z.literal('MEMORIAL_DESCRITIVO').default('MEMORIAL_DESCRITIVO'),
  corposDagua: z.array(z.object({
    nome: z.string(),
    tipoCorpo: CorpoTipoEnum.default('DESCONHECIDO'),
    areaM2: EvidNumero,
    volumeM3: EvidNumero,       // só se ESCRITO no memorial — nunca calculado
    profundidadeM: EvidNumero,  // só se ESCRITA no memorial
  })).default([]),
  sistemas: z.array(z.object({
    sistema: z.string(),        // FILTRAGEM | LED | AQUECIMENTO | ... (texto livre do memorial)
    descricao: EvidTexto,
  })).default([]),
  especificacoes: z.array(z.object({
    item: z.string(),
    descricao: z.string(),
    fonte: z.string(),
    pagina: z.number().int().positive().nullable().default(null),
  })).default([]),
  observacoes: z.array(z.string()).default([]),
});

export type ExtracaoArquitetonica = z.infer<typeof ExtracaoArquitetonicaSchema>;
export type ExtracaoHidraulica = z.infer<typeof ExtracaoHidraulicaSchema>;
export type ExtracaoEletrica = z.infer<typeof ExtracaoEletricaSchema>;
export type ExtracaoCortes = z.infer<typeof ExtracaoCortesSchema>;
export type ExtracaoEquipamentos = z.infer<typeof ExtracaoEquipamentosSchema>;
export type ExtracaoEstrutural = z.infer<typeof ExtracaoEstruturalSchema>;
export type ExtracaoMemorial = z.infer<typeof ExtracaoMemorialSchema>;

export type ExtracaoDisciplina =
  | ExtracaoArquitetonica | ExtracaoHidraulica | ExtracaoEletrica | ExtracaoCortes
  | ExtracaoEquipamentos | ExtracaoEstrutural | ExtracaoMemorial;
