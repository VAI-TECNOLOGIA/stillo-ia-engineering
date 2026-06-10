import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { isDemo } from '@/lib/demo';

/**
 * Banner de apresentação — aparece apenas no modo DEMO.
 * Nancy Duarte: contextualiza o visitante ANTES de entrar no sistema.
 * UX Designer: sticky top, não bloqueia, dispensável mas memorável.
 */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  if (!isDemo() || hidden) return null;

  return (
    <div className="relative flex items-center justify-between gap-4 border-b bg-gradient-to-r from-sky-600 to-primary px-4 py-2.5 text-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold tracking-wide">
          <Sparkles className="h-4 w-4" />
          DEMONSTRAÇÃO AO VIVO
        </span>
        <span className="hidden text-sky-100 sm:inline">
          Sistema real · 12 meses de operação · 510 orçamentos gerados · R$ 7,5M aprovados
        </span>
        <Link
          to="/orcamentos/novo"
          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium hover:bg-white/30 transition-colors"
        >
          Experimentar agora <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button
        onClick={() => setHidden(true)}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
        aria-label="Fechar banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
