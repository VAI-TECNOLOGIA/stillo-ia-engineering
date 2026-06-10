/**
 * FactBuilder — deriva os "fatos" de uma piscina + obra para alimentar as regras.
 * Domínio puro: não conhece Prisma. Recebe shapes simples.
 * Ver docs/04-MOTOR-DE-REGRAS.md (tabela de fatos).
 */
import type { Fatos } from './types';

export interface PiscinaInput {
  id?: string;
  nome?: string;
  tipo?: 'INTERNA' | 'EXTERNA';
  comprimentoM?: number | null;
  larguraM?: number | null;
  profundidadeM?: number | null;
  /** Sistemas ativos (valores de SistemaTipo: 'LED', 'BORDA_INFINITA', ...). */
  sistemas?: string[];
}

export interface ObraInput {
  cidade?: string | null;
  uf?: string | null;
  regiao?: string | null;
}

function n(v: number | null | undefined): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function construirFatos(piscina: PiscinaInput, obra: ObraInput = {}): Fatos {
  const comp = n(piscina.comprimentoM);
  const larg = n(piscina.larguraM);
  const prof = n(piscina.profundidadeM);

  const fatos: Fatos = {
    'piscina.tipo': piscina.tipo ?? 'EXTERNA',
    'piscina.interna': piscina.tipo === 'INTERNA',
    'piscina.sistemas': piscina.sistemas ?? [],
    'obra.cidade': obra.cidade ?? null,
    'obra.uf': obra.uf ?? null,
    'obra.regiao': obra.regiao ?? null,
  };

  if (comp !== undefined) fatos['piscina.comprimentoM'] = comp;
  if (larg !== undefined) fatos['piscina.larguraM'] = larg;
  if (prof !== undefined) fatos['piscina.profundidadeM'] = prof;

  if (comp !== undefined && larg !== undefined) {
    fatos['piscina.areaM2'] = round2(comp * larg);
    fatos['piscina.perimetroM'] = round2(2 * (comp + larg));
    if (prof !== undefined) {
      fatos['piscina.volumeM3'] = round2(comp * larg * prof);
    }
  }

  return fatos;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
