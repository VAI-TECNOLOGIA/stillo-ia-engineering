import { useEffect, useState, type ReactNode } from 'react';
import { Sparkles, Clock, ArrowRight, Lock, MessageCircle } from 'lucide-react';
import { isDemo } from '@/lib/demo';
import { Button } from '@/components/ui/button';

/**
 * Contagem regressiva da DEMONSTRAÇÃO (somente modo demo).
 * Prazo FIXO e absoluto (UTC) — igual para qualquer visitante, não dá para
 * burlar limpando o navegador. Ao expirar, o app inteiro é coberto por um
 * overlay "Demonstração finalizada". Trocar o prazo = editar DEMO_DEADLINE.
 */
const DEMO_DEADLINE = '2026-06-15T21:25:05Z'; // 48h a partir de 13/06/2026 18:25 BRT
const WHATSAPP = '5598999999999';             // mesmo placeholder da landing — trocar pelo nº comercial

/** Tempo restante (ms) até o prazo, atualizado a cada segundo. */
function useRestante(): number {
  const [restante, setRestante] = useState(() => +new Date(DEMO_DEADLINE) - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRestante(+new Date(DEMO_DEADLINE) - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return restante;
}

function hhmmss(ms: number): { h: string; m: string; s: string } {
  const tot = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(tot / 3600);
  const m = Math.floor((tot % 3600) / 60);
  const s = tot % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return { h: p(h), m: p(m), s: p(s) };
}

/** Barra fina no TOPO com o relógio regressivo. Esconde quando expira (entra o overlay). */
function CountdownBar({ restante }: { restante: number }) {
  const { h, m, s } = hhmmss(restante);
  const urgente = restante < 6 * 3600 * 1000; // < 6h → vermelho pulsante

  return (
    <div
      className={
        'flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-white ' +
        (urgente ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-sky-600 to-primary')
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold tracking-wide">
          <Sparkles className="h-4 w-4" /> DEMONSTRAÇÃO
        </span>
        <span className={'flex items-center gap-1.5 ' + (urgente ? 'animate-pulse' : '')}>
          <Clock className="h-4 w-4" />
          <span className="text-xs opacity-90">expira em</span>
          <span className="font-mono text-base font-bold tabular-nums tracking-tight">
            {h}:{m}:{s}
          </span>
        </span>
        <span className="hidden text-sky-100 lg:inline">Sistema real · acesso temporário para avaliação</span>
      </div>
      <a
        href="/orcamentos/novo"
        className="hidden shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium transition-colors hover:bg-white/30 sm:inline-flex"
      >
        Experimentar agora <ArrowRight className="h-3 w-3" />
      </a>
    </div>
  );
}

/** Overlay que cobre TUDO quando a demo expira. */
function ExpiradoOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Demonstração finalizada</h1>
        <p className="mt-2 text-muted-foreground">
          O período de demonstração da <span className="font-medium text-foreground">STILLO IA</span> chegou ao fim.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Gostou do que viu? Fale com a gente para ativar o seu acesso definitivo.
        </p>
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex">
          <Button size="lg">
            <MessageCircle className="h-5 w-5" /> Falar com a VAI Tecnologia
          </Button>
        </a>
        <p className="mt-6 text-xs text-muted-foreground">STILLO IA Engineering · por VAI Tecnologia</p>
      </div>
    </div>
  );
}

/**
 * Envolve o app inteiro. Fora do modo demo: passa direto.
 * Modo demo: barra de contagem no topo; ao expirar, só o overlay.
 */
export function DemoGate({ children }: { children: ReactNode }) {
  const restante = useRestante();

  if (!isDemo()) return <>{children}</>;
  if (restante <= 0) return <ExpiradoOverlay />;

  return (
    <div className="flex h-full flex-col">
      <CountdownBar restante={restante} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
