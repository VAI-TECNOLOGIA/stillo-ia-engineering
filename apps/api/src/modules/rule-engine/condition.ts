/**
 * Avaliador de condições (QUANDO). Recursivo sobre todas/alguma/nao/comparação.
 */
import type { Condicao, Fatos, Operador } from './types';

export function avaliarCondicao(cond: Condicao, fatos: Fatos): boolean {
  if ('todas' in cond) return cond.todas.every((c) => avaliarCondicao(c, fatos));
  if ('alguma' in cond) return cond.alguma.some((c) => avaliarCondicao(c, fatos));
  if ('nao' in cond) return !avaliarCondicao(cond.nao, fatos);
  return comparar(fatos[cond.fato], cond.op, cond.valor);
}

function comparar(esquerda: unknown, op: Operador, direita: unknown): boolean {
  switch (op) {
    case '=':
      return esquerda === direita;
    case '!=':
      return esquerda !== direita;
    case '>':
    case '>=':
    case '<':
    case '<=': {
      if (typeof esquerda !== 'number' || typeof direita !== 'number') return false;
      if (op === '>') return esquerda > direita;
      if (op === '>=') return esquerda >= direita;
      if (op === '<') return esquerda < direita;
      return esquerda <= direita;
    }
    case 'in':
      return Array.isArray(direita) && direita.includes(esquerda as never);
    case 'contem':
      return Array.isArray(esquerda) && esquerda.includes(direita as never);
    case 'entre': {
      if (typeof esquerda !== 'number' || !Array.isArray(direita) || direita.length !== 2) return false;
      const [min, max] = direita as [number, number];
      return esquerda >= min && esquerda <= max;
    }
    default:
      return false;
  }
}
