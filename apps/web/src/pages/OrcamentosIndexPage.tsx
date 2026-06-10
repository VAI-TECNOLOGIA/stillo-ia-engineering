import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronRight, Loader2, Sparkles, Plus } from 'lucide-react';
import { orcamentosApi, type OrcamentoStatus } from '@/lib/orcamentos.api';
import { Card } from '@/components/ui/card';
import { formatBRL, cn } from '@/lib/utils';

const STATUS_CLS: Record<OrcamentoStatus, string> = {
  RASCUNHO: 'bg-muted text-muted-foreground',
  EM_REVISAO: 'bg-sky-100 text-sky-700',
  APROVADO: 'bg-emerald-100 text-emerald-700',
  ENVIADO: 'bg-indigo-100 text-indigo-700',
  RECUSADO: 'bg-destructive/10 text-destructive',
};

export function OrcamentosIndexPage() {
  const { data, isLoading } = useQuery({ queryKey: ['orcamentos'], queryFn: () => orcamentosApi.list() });
  const orcamentos = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileText className="h-6 w-6 text-primary" /> Orçamentos
          </h1>
          <p className="text-muted-foreground">
            Envie a planta e a IA gera o orçamento conversando com você.
          </p>
        </div>
        <div className="relative shrink-0">
          {/* Círculo amarelo pulsante */}
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-yellow-400" />
          </span>
          <Link
            to="/orcamentos/novo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" /> Novo com IA
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Nº</th>
              <th className="p-3 font-medium">Obra</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!isLoading && orcamentos.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Nenhum orçamento ainda</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">Envie uma planta e a IA gera o orçamento técnico em minutos.</p>
                    </div>
                    <Link to="/orcamentos/novo" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-4 w-4" /> Criar primeiro orçamento com IA
                    </Link>
                  </div>
                </td>
              </tr>
            )}
            {orcamentos.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono">#{o.numero}</td>
                <td className="p-3 font-medium">{o.obra?.nome ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{o.obra?.cliente?.nome ?? '—'}</td>
                <td className="p-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLS[o.status])}>{o.status}</span></td>
                <td className="p-3 font-medium">{formatBRL(Number(o.valorTotal))}</td>
                <td className="p-3 text-right"><Link to={`/orcamentos/${o.id}`} className="inline-flex items-center text-primary"><ChevronRight className="h-5 w-5" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
