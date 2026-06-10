import { z } from 'zod';

/** Sistemas reconhecíveis (alinhado a SistemaTipo do Prisma). */
export const SistemaEnum = z.enum([
  'FILTRAGEM', 'LED', 'AQUECIMENTO', 'HIDROMASSAGEM', 'CASCATA',
  'BORDA_INFINITA', 'PRAINHA', 'SPA', 'SAUNA', 'TRATAMENTO',
]);

export const PiscinaExtraidaSchema = z.object({
  nome: z.string().optional(),
  tipo: z.enum(['INTERNA', 'EXTERNA']).optional(),
  comprimentoM: z.number().positive().nullable().optional(),
  larguraM: z.number().positive().nullable().optional(),
  profundidadeM: z.number().positive().nullable().optional(),
  sistemas: z.array(SistemaEnum).default([]),
  observacoes: z.string().optional(),
  /** Confiança 0..1 atribuída pela IA. */
  confianca: z.number().min(0).max(1).default(0.5),
});

export const ProjetoExtraidoSchema = z.object({
  piscinas: z.array(PiscinaExtraidaSchema).default([]),
  avisos: z.array(z.string()).default([]),
});

export type PiscinaExtraida = z.infer<typeof PiscinaExtraidaSchema>;
export type ProjetoExtraido = z.infer<typeof ProjetoExtraidoSchema>;

/**
 * Faz parse robusto da resposta da IA: aceita JSON puro ou cercado por ```json,
 * e valida contra o schema. Lança se inválido (caller trata como aviso).
 */
export function parseExtraction(raw: string): ProjetoExtraido {
  const limpo = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const json = JSON.parse(limpo);
  return ProjetoExtraidoSchema.parse(json);
}

/** Volume derivado (m³) quando há as 3 medidas. */
export function volumeM3(p: PiscinaExtraida): number | undefined {
  if (p.comprimentoM && p.larguraM && p.profundidadeM) {
    return Math.round(p.comprimentoM * p.larguraM * p.profundidadeM * 100) / 100;
  }
  return undefined;
}
