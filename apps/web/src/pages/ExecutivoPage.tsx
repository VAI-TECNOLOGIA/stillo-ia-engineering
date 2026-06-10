import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, DollarSign, Clock, Loader2 } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';

const PRIMARY = 'hsl(199 89% 39%)';

function fmtTempo(min: number | null): string {
  if (min == null) return '—';
  return min >= 60 ? `${Math.round(min / 60)} h` : `${min} min`;
}

export function ExecutivoPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard', 'executivo'], queryFn: () => dashboardApi.executivo() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6 text-primary" /> Dashboard Executivo
        </h1>
        <p className="text-muted-foreground">Visão estratégica {isLoading ? '(carregando...)' : 'dos últimos 6 meses'}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><DollarSign className="h-5 w-5 text-primary" /><div className="mt-1 text-xl font-bold">{formatBRL(data?.valorOrcadoMes ?? 0)}</div><div className="text-xs text-muted-foreground">Valor orçado (mês)</div></CardContent></Card>
        <Card><CardContent className="p-4"><Clock className="h-5 w-5 text-primary" /><div className="mt-1 text-xl font-bold">{fmtTempo(data?.tempoMedioMin ?? null)}</div><div className="text-xs text-muted-foreground">Tempo médio</div></CardContent></Card>
        <Card><CardContent className="p-4"><BarChart3 className="h-5 w-5 text-primary" /><div className="mt-1 text-xl font-bold">{data?.equipamentos.length ?? 0}</div><div className="text-xs text-muted-foreground">Equip. no ranking</div></CardContent></Card>
        <Card><CardContent className="p-4"><BarChart3 className="h-5 w-5 text-primary" /><div className="mt-1 text-xl font-bold">{data?.porCidade.length ?? 0}</div><div className="text-xs text-muted-foreground">Cidades ativas</div></CardContent></Card>
      </div>

      {isLoading && <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>}

      {data && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Tendência — valor orçado por mês</CardTitle></CardHeader>
            <CardContent>
              {data.tendencia.length === 0 ? <Vazio /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.tendencia} margin={{ left: 0, right: 8 }}>
                    <defs><linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PRIMARY} stopOpacity={0.4} /><stop offset="95%" stopColor={PRIMARY} stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" width={70} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatBRL(Number(v))} />
                    <Area type="monotone" dataKey="valor" stroke={PRIMARY} fill="url(#ge)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Equipamentos mais usados</CardTitle></CardHeader>
              <CardContent>
                {data.equipamentos.length === 0 ? <Vazio /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.equipamentos} layout="vertical" margin={{ left: 10, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="item" width={140} tickLine={false} axisLine={false} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="total" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Fabricantes & Cidades</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Fabricante mais vendido</div>
                  {data.fabricantes.length === 0 ? <p className="text-muted-foreground">—</p> : data.fabricantes.map((f) => (
                    <div key={f.fabricante} className="flex justify-between"><span>{f.fabricante}</span><span className="font-medium">{f.total}</span></div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Por cidade</div>
                  {data.porCidade.length === 0 ? <p className="text-muted-foreground">—</p> : data.porCidade.map((c) => (
                    <div key={c.cidade} className="flex justify-between"><span>{c.cidade}</span><span className="font-medium">{c.total}</span></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Vazio() {
  return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda — aprove alguns orçamentos.</p>;
}
