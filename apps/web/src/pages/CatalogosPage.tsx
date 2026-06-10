import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, BookOpen, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { catalogosApi, type StatusIndexacao } from '@/lib/catalogos.api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CatalogosPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['catalogos'],
    queryFn: () => catalogosApi.list(),
    refetchInterval: (q) => (q.state.data?.some((c) => c.statusIndexacao === 'PENDENTE' || c.statusIndexacao === 'INDEXANDO') ? 2500 : false),
  });

  const upload = useMutation({
    mutationFn: (file: File) => catalogosApi.upload(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos'] }),
  });
  const reindex = useMutation({
    mutationFn: (id: string) => catalogosApi.reindexar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos'] }),
  });

  const catalogos = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpen className="h-6 w-6 text-primary" /> Catálogos Técnicos
          </h1>
          <p className="text-muted-foreground">PDF/CSV são indexados (chunks + embeddings) e alimentam a busca e o chat técnico.</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.csv,.txt,.xls,.xlsx,.doc,.docx"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
        <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          <Upload className="h-4 w-4" /> {upload.isPending ? 'Enviando...' : 'Enviar catálogo'}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Catálogo</th>
              <th className="p-3 font-medium">Formato</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Trechos</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!isLoading && catalogos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum catálogo. Envie um PDF/CSV de produtos.</td></tr>}
            {catalogos.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{c.nome}</td>
                <td className="p-3 text-muted-foreground">{c.fonte}</td>
                <td className="p-3"><StatusBadge status={c.statusIndexacao} erro={c.erro} /></td>
                <td className="p-3 text-muted-foreground">{c.totalChunks}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => reindex.mutate(c.id)} disabled={reindex.isPending}><RefreshCw className="h-4 w-4" /> Reindexar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatusBadge({ status, erro }: { status: StatusIndexacao; erro?: string | null }) {
  const map: Record<StatusIndexacao, { label: string; cls: string; icon: JSX.Element }> = {
    PENDENTE: { label: 'Na fila', cls: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
    INDEXANDO: { label: 'Indexando', cls: 'bg-sky-100 text-sky-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    INDEXADO: { label: 'Indexado', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    FALHA: { label: 'Falha', cls: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const s = map[status];
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.cls)} title={erro ?? undefined}>{s.icon} {s.label}</span>;
}
