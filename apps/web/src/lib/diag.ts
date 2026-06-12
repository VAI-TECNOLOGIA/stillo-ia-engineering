/**
 * Diagnóstico do frontend — captura logs de cada etapa e erros globais.
 *
 * Por que existe: quando o cliente testa o fluxo real (upload → análise 3-IA →
 * confirmação), qualquer falha precisa ser rastreável sem depender de print.
 * Tudo vai pro console com prefixo [STILLO] e fica acumulado em
 * `window.__stilloDiag` — para suporte: abrir o console e enviar
 * `copy(JSON.stringify(window.__stilloDiag, null, 2))`.
 */

interface DiagEvento {
  ts: string;
  ev: string;
  dados?: unknown;
}

const buf: DiagEvento[] = [];
const MAX = 300;

export function diagLog(ev: string, dados?: unknown): void {
  const e: DiagEvento = { ts: new Date().toISOString(), ev, ...(dados !== undefined ? { dados } : {}) };
  buf.push(e);
  if (buf.length > MAX) buf.shift();
  (window as unknown as Record<string, unknown>).__stilloDiag = buf;
  // eslint-disable-next-line no-console
  console.info(`[STILLO ${e.ts.slice(11, 19)}]`, ev, dados ?? '');
}

export function diagErro(ev: string, erro: unknown): string {
  const msg = erro instanceof Error ? erro.message : String(erro);
  const extra = (erro as { status?: number; body?: unknown }) ?? {};
  diagLog(`ERRO ${ev}`, { mensagem: msg, status: extra.status, body: extra.body });
  // eslint-disable-next-line no-console
  console.error(`[STILLO] ERRO ${ev}:`, erro);
  return msg;
}

/** Listeners globais — registrar uma única vez no boot do app. */
export function initDiag(): void {
  window.addEventListener('error', (e) => {
    diagLog('window.error', { mensagem: e.message, origem: `${e.filename}:${e.lineno}` });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | undefined;
    diagLog('unhandledrejection', { mensagem: r?.message ?? String(e.reason) });
  });
  diagLog('app iniciado', { demo: import.meta.env.VITE_DEMO === 'true', api: import.meta.env.VITE_API_URL ?? '(relativo)' });
}
