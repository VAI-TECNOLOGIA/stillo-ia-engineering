/**
 * Normalização numérica para o consenso entre IAs.
 * "1,50m", "1.5", "150 cm" são o MESMO número — sem isso as IAs "divergiriam"
 * por formatação, não por leitura. Tudo vira unidade canônica antes de comparar.
 */

/** Converte texto numérico BR/EN em número. "1,50" → 1.5 · "1.234,56" → 1234.56 */
export function parseNumeroBR(entrada: unknown): number | null {
  if (typeof entrada === 'number') return Number.isFinite(entrada) ? entrada : null;
  if (typeof entrada !== 'string') return null;
  let s = entrada.trim().replace(/[^\d.,-]/g, ''); // tira unidades, espaços, "m²", "cm"
  if (!s) return null;
  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');
  if (temVirgula && temPonto) {
    // o último separador é o decimal (formato BR "1.234,56" ou EN "1,234.56")
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (temVirgula) {
    s = s.replace(',', '.'); // vírgula decimal BR
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Detecta a unidade no texto original (para conversão). Pega unidade colada ao número (150cm). */
function detectarUnidade(texto: string): 'mm' | 'cm' | 'm' | null {
  const t = texto.toLowerCase();
  if (/mm|mil[ií]metr/.test(t)) return 'mm';        // mais específico primeiro
  if (/cm|cent[ií]metr/.test(t)) return 'cm';
  if (/m\b|metro|\dm/.test(t)) return 'm';
  return null;                                       // sem unidade → caller assume metros
}

/** Comprimento → metros. Aceita número (assume m) ou string com unidade. */
export function normalizarComprimentoM(valor: unknown, unidade?: string): number | null {
  const textoUnidade = (unidade ?? (typeof valor === 'string' ? valor : '')) || '';
  const n = parseNumeroBR(valor);
  if (n === null) return null;
  switch (detectarUnidade(textoUnidade)) {
    case 'mm': return arred(n / 1000);
    case 'cm': return arred(n / 100);
    default:   return arred(n); // já em metros
  }
}

/** Área → m². Aceita número (assume m²) ou string com unidade (cm², mm²). */
export function normalizarAreaM2(valor: unknown, unidade?: string): number | null {
  const textoUnidade = (unidade ?? (typeof valor === 'string' ? valor : '')) || '';
  const n = parseNumeroBR(valor);
  if (n === null) return null;
  const t = textoUnidade.toLowerCase();
  if (/cm[²2]|cm2/.test(t)) return arred(n / 10000);
  if (/mm[²2]|mm2/.test(t)) return arred(n / 1_000_000);
  return arred(n);
}

function arred(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Dois números são "o mesmo" dentro de tolerância relativa (0,5%) ou absoluta (1cm).
 * Mesma regra do consolidador — coerência em todo o motor.
 */
export function mesmoNumero(a: number, b: number, tolRel = 0.005, tolAbs = 0.01): boolean {
  const tol = Math.max(tolAbs, Math.abs(a) * tolRel);
  return Math.abs(a - b) <= tol;
}
