import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GraduationCap, RefreshCw, Repeat, Trash2, BookMarked, Loader2 } from 'lucide-react';
import { aprendizadoApi, type Padrao } from '@/lib/aprendizado.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';

export function AprendizadoPage() {
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const stats = useQuery({ queryKey: ['aprendizado', 'stats'], queryFn: () => aprendizadoApi.estatisticas() });
  const sugestoes = useQuery({ queryKey: ['aprendizado', 'sugestoes'], queryFn: () => aprendizadoApi.sugestoes() });
  const kb = useQuery({ queryKey: ['aprendizado', 'kb'], queryFn: () => aprendizadoApi.baseConhecimento() });

  const gerar = useMutation({
    mutationFn: () => aprendizadoApi.gerar(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aprendizado', 'kb'] }),
  });

  const e = stats.data;
  const kpis = [
    { label: 'Correções (90d)', valor: e?.total ?? 0 },
    { label: 'Com justificativa', valor: e?.comJustificativa ?? 0 },
    { label: 'Produtos trocados', valor: e?.produtosTrocados ?? 0 },
    { label: 'Conhecimento (RAG)', valor: kb.data?.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <GraduationCap className="h-6 w-6 text-primary" /> Aprendizado
        </h1>
        <p className="text-muted-foreground">Cada correção humana vira estatística, padrão e conhecimento — o sistema melhora com o uso.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="p-4"><div className="text-2xl font-bold">{k.valor}</div><div className="text-xs text-muted-foreground">{k.label}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Correções por dia</CardTitle></CardHeader>
          <CardContent>
            {e && e.porDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={e.porDia} margin={{ left: -20 }}>
                  <XAxis dataKey="dia" tickLine={false} axisLine={false} className="text-xs" tickFormatter={undefined} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(199 89% 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem correções ainda. Revise um orçamento para gerar aprendizado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Repeat className="h-4 w-4 text-primary" /> Padrões recorrentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sugestoes.isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
            {sugestoes.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum padrão recorrente detectado.</p>}
            {(sugestoes.data ?? []).map((p) => <PadraoCard key={p.chave} p={p} />)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><BookMarked className="h-4 w-4 text-primary" /> Base de Conhecimento (RAG)</CardTitle>
          {hasPermission('aprendizado:gerir') && (
            <Button size="sm" onClick={() => gerar.mutate()} disabled={gerar.isPending}>
              {gerar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Consolidar correções
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {gerar.isSuccess && <p className="text-sm text-emerald-600">{gerar.data.criadas} entrada(s) criada(s) de {gerar.data.analisadas} analisada(s).</p>}
          {kb.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Vazia. Clique em "Consolidar correções" para indexar as justificativas.</p>}
          {(kb.data ?? []).map((k) => (
            <div key={k.id} className="rounded-md border p-2 text-sm">
              <p>{k.conteudo}</p>
              <div className="mt-1 flex gap-1">{k.tags.map((t) => <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t}</span>)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PadraoCard({ p }: { p: Padrao }) {
  const Icon = p.tipo === 'TROCA_PRODUTO' ? Repeat : Trash2;
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm">{p.descricao}</p>
          {p.exemplo && <p className="mt-0.5 text-xs text-muted-foreground">{p.exemplo}</p>}
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{p.ocorrencias}×</span>
      </div>
    </div>
  );
}
