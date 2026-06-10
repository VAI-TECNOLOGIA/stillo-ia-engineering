/**
 * Avaliador de expressões aritméticas SEGURO (sem `eval`/`Function`).
 * Suporta: + - * / %, parênteses, número decimal, identificadores com ponto
 * (resolvidos contra os fatos) e funções whitelisted.
 *
 * Gramática (descida recursiva):
 *   expr   := term (('+'|'-') term)*
 *   term   := unary (('*'|'/'|'%') unary)*
 *   unary  := '-' unary | primary
 *   primary:= NUMBER | IDENT('.'IDENT)* | FUNC '(' args ')' | '(' expr ')'
 *   args   := expr (',' expr)*
 */
import type { Fatos } from './types';

type Token =
  | { t: 'num'; v: number }
  | { t: 'ident'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lparen' }
  | { t: 'rparen' }
  | { t: 'comma' };

const FUNCOES: Record<string, (...args: number[]) => number> = {
  teto: Math.ceil,
  piso: Math.floor,
  arredondar: Math.round,
  abs: Math.abs,
  raiz: Math.sqrt,
  min: Math.min,
  max: Math.max,
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c >= '0' && c <= '9') {
      let num = '';
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      tokens.push({ t: 'num', v: Number(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let id = '';
      while (i < src.length && /[a-zA-Z0-9_.]/.test(src[i])) id += src[i++];
      tokens.push({ t: 'ident', v: id });
      continue;
    }
    if ('+-*/%'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { tokens.push({ t: 'lparen' }); i++; continue; }
    if (c === ')') { tokens.push({ t: 'rparen' }); i++; continue; }
    if (c === ',') { tokens.push({ t: 'comma' }); i++; continue; }
    throw new Error(`Caractere inválido na expressão: "${c}"`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[], private readonly fatos: Fatos) {}

  parse(): number {
    const v = this.expr();
    if (this.pos < this.tokens.length) throw new Error('Expressão malformada (tokens sobrando).');
    return v;
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }

  private expr(): number {
    let v = this.term();
    let tk = this.peek();
    while (tk && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
      this.next();
      const rhs = this.term();
      v = tk.v === '+' ? v + rhs : v - rhs;
      tk = this.peek();
    }
    return v;
  }

  private term(): number {
    let v = this.unary();
    let tk = this.peek();
    while (tk && tk.t === 'op' && (tk.v === '*' || tk.v === '/' || tk.v === '%')) {
      this.next();
      const rhs = this.unary();
      if ((tk.v === '/' || tk.v === '%') && rhs === 0) throw new Error('Divisão por zero na expressão.');
      v = tk.v === '*' ? v * rhs : tk.v === '/' ? v / rhs : v % rhs;
      tk = this.peek();
    }
    return v;
  }

  private unary(): number {
    const tk = this.peek();
    if (tk && tk.t === 'op' && tk.v === '-') { this.next(); return -this.unary(); }
    return this.primary();
  }

  private primary(): number {
    const tk = this.next();
    if (!tk) throw new Error('Expressão incompleta.');
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'lparen') {
      const v = this.expr();
      const close = this.next();
      if (!close || close.t !== 'rparen') throw new Error('Parêntese não fechado.');
      return v;
    }
    if (tk.t === 'ident') {
      // função?
      if (this.peek()?.t === 'lparen') {
        const fn = FUNCOES[tk.v];
        if (!fn) throw new Error(`Função não permitida: "${tk.v}"`);
        this.next(); // consome '('
        const args: number[] = [];
        if (this.peek()?.t !== 'rparen') {
          args.push(this.expr());
          while (this.peek()?.t === 'comma') { this.next(); args.push(this.expr()); }
        }
        const close = this.next();
        if (!close || close.t !== 'rparen') throw new Error('Parêntese de função não fechado.');
        return fn(...args);
      }
      // identificador → fato
      const val = this.fatos[tk.v];
      if (typeof val !== 'number') {
        throw new Error(`Fato "${tk.v}" ausente ou não-numérico na expressão.`);
      }
      return val;
    }
    throw new Error('Token inesperado na expressão.');
  }
}

/** Avalia uma expressão numérica segura contra os fatos. */
export function avaliarExpressao(expr: string, fatos: Fatos): number {
  const tokens = tokenize(expr);
  const result = new Parser(tokens, fatos).parse();
  if (!Number.isFinite(result)) throw new Error('Resultado de expressão não finito.');
  return result;
}
