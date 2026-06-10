import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Wallet, Trophy, Target, Receipt, Clock, TrendingUp, Sparkles, AlertTriangle,
  ArrowRight, FileText, Ruler, Send, CheckCircle2, Building2, Brain, Users,
  XCircle, Zap, HelpCircle, RefreshCw, Bell, X,
} from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { isDemo } from '@/lib/demo';

const PRIMARY = 'hsl(199 89% 39%)';

function fmtTempo(min: number | null): string {
  if (min == null) return '—';
  if (min >= 1440) return `${Math.round(min / 1440)} d`;
  if (min >= 60) return `${Math.round(min / 60)} h`;
  return `${min} min`;
}
function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
function fmtK(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return formatBRL(v);
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  RASCUNHO: { label: 'Rascunho', color: '#94a3b8' },
  EM_REVISAO: { label: 'Em revisão', color: '#f59e0b' },
  ENVIADO: { label: 'Enviado', color: '#3b82f6' },
  APROVADO: { label: 'Aprovado', color: '#10b981' },
  RECUSADO: { label: 'Recusado', color: '#ef4444' },
};

// ── Banner "o que há de novo" ──────────────────────────────────────────────────
// Incrementar BANNER_ID para forçar reexibição numa nova versão
const BANNER_ID = 'stillo-update-2026-06-09-v2';

const NOVIDADES = [
  { icon: '🤖', texto: 'IA de leitura de plantas reformulada — análise com confiança, sistemas e avisos técnicos' },
  { icon: '📋', texto: 'Fluxo de orçamento com perguntas estruturadas e botões de resposta rápida' },
  { icon: '📊', texto: 'Dashboard com indicadores em tempo real e tooltips explicativos' },
  { icon: '🔒', texto: 'Nova tela Acessos: trilha de auditoria com filtros por tipo de ação' },
  { icon: '✨', texto: 'Telas com estados de carregamento animados e mensagens de erro claras' },
];

function UpdateBanner() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(BANNER_ID) !== 'dismissed'; } catch { return true; }
  });

  function dismiss() {
    try { localStorage.setItem(BANNER_ID, 'dismissed'); } catch { /* noop */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/8 to-sky-50 px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Bell className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Sistema atualizado hoje — 09/06/2026</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Melhorias aplicadas com base no feedback do teste:</p>
            <ul className="mt-2 space-y-1">
              {NOVIDADES.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="mt-px">{n.icon}</span>
                  <span>{n.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button onClick={dismiss} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Dispensar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const KPI_TOOLTIPS: Record<string, string> = {
  'Pipeline ativo': 'Soma dos valores dos orçamentos em aberto (aguardando revisão + enviados ao cliente)',
  'Ganho no mês': 'Valor total dos orçamentos com status APROVADO no mês atual',
  'Taxa de conversão': 'Orçamentos aprovados ÷ total enviados × 100%. Média do setor: ~45%',
  'Ticket médio': 'Valor médio dos orçamentos aprovados nos últimos 12 meses',
  'Ciclo médio': 'Tempo médio do upload da planta até o orçamento enviado ao cliente',
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard', 'operacional'], queryFn: () => dashboardApi.operacional() });

  const heroKpis = [
    { label: 'Pipeline ativo', sub: `${data?.aguardandoRevisao ?? 0} em aberto + ${data?.enviados ?? 0} enviados`, valor: fmtK(data?.pipelineValor ?? 0), icon: Wallet, tone: 'text-sky-600 bg-sky-50', badge: null },
    { label: 'Ganho no mês', sub: `${data?.aprovados ?? 0} orçamentos aprovados`, valor: fmtK(data?.aprovadoValorMes ?? 0), icon: Trophy, tone: 'text-emerald-600 bg-emerald-50', badge: null },
    { label: 'Taxa de conversão', sub: '↑ vs 45% média do setor', valor: fmtPct(data?.taxaConversao ?? 0), icon: Target, tone: 'text-violet-600 bg-violet-50', badge: '+30pp' },
    { label: 'Ticket médio', sub: '+18% em 12 meses', valor: fmtK(data?.ticketMedio ?? 0), icon: Receipt, tone: 'text-amber-600 bg-amber-50', badge: null },
    { label: 'Ciclo médio', sub: '⚡ 24× mais rápido que manual', valor: fmtTempo(data?.tempoMedioMin ?? null), icon: Clock, tone: 'text-slate-600 bg-slate-100', badge: 'vs 4h+' },
  ];

  const f = data?.funil;
  const stages = [
    { label: 'Obras', valor: f?.obras ?? 0, icon: Building2 },
    { label: 'Leituras IA', valor: f?.leiturasIa ?? 0, icon: Sparkles },
    { label: 'Dimensionamentos', valor: f?.dimensionamentos ?? 0, icon: Ruler },
    { label: 'Orçamentos', valor: f?.orcamentos ?? 0, icon: FileText },
    { label: 'Enviados', valor: f?.enviados ?? 0, icon: Send },
    { label: 'Aprovados', valor: f?.aprovados ?? 0, icon: CheckCircle2 },
  ];
  const maxStage = Math.max(1, ...stages.map((s) => s.valor));

  const ranking = data?.ranking ?? [];
  const topClientes = data?.topClientes ?? [];
  const tendencia = data?.tendencia ?? [];
  const porStatus = data?.porStatus ?? [];
  const ia = data?.ia ?? { itensIa: 0, itensRegra: 0, itensManual: 0, correcoes: 0 };
  const iaTotal = ia.itensIa + ia.itensRegra + ia.itensManual;
  const atencao = data?.atencao ?? { revisaoParada: 0, obrasSemOrcamento: 0, leiturasRevisar: 0 };
  const vazio = !isLoading && (data?.funil?.orcamentos ?? 0) === 0 && (data?.funil?.obras ?? 0) === 0;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive/70" />
        <div>
          <p className="font-semibold">Não foi possível carregar o dashboard</p>
          <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UpdateBanner />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {user?.nome?.split(' ')[0] ?? 'bem-vindo'} 👋</h1>
          <p className="text-muted-foreground">Centro de comando — visão estratégica do negócio.</p>
        </div>
        <Link to="/executivo" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent">
          <TrendingUp className="h-4 w-4" /> Visão executiva <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* CTA de tour guiado — UX Designer: entrada clara, sempre visível no demo */}
      {isDemo() && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div>
            <p className="font-semibold text-foreground">
              ✦ Explore o demo ao vivo — comece pelo fluxo principal
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Envie uma planta, veja a IA ler e gerar o orçamento completo em minutos.
            </p>
          </div>
          <Link
            to="/orcamentos/novo"
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Novo Orçamento com IA <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {vazio && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="text-lg font-medium">Seu sistema está pronto pra começar</p>
            <p className="max-w-md text-sm text-muted-foreground">Cadastre um cliente e gere o primeiro orçamento com IA. Os indicadores estratégicos aparecem aqui automaticamente.</p>
            <div className="mt-2 flex gap-2">
              <Link to="/clientes" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">+ Novo cliente</Link>
              <Link to="/orcamentos/novo" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Novo orçamento com IA</Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HERO KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                  <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))
          : heroKpis.map((k) => (
              <Card key={k.label} className="group relative">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.tone}`}><k.icon className="h-5 w-5" /></div>
                    <div className="flex items-center gap-1">
                      {k.badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{k.badge}</span>}
                      <span className="relative" title={KPI_TOOLTIPS[k.label]}>
                        <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground/50 hover:text-muted-foreground" />
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold leading-none">{k.valor}</div>
                  <div>
                    <div className="text-sm font-medium">{k.label}</div>
                    <div className="text-xs text-muted-foreground">{k.sub}</div>
                  </div>
                </CardContent>
              </Card>
            ))
        }
      </div>

      {/* ANTES vs DEPOIS — Nancy Duarte: narrativa de transformação */}
      {isDemo() && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Antes */}
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-semibold text-red-700">Antes: método tradicional</span>
            </div>
            <ul className="space-y-2 text-sm text-red-800">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-red-400">✗</span> <span><strong>4+ horas</strong> por orçamento em planilha</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-red-400">✗</span> <span>Erro humano frequente em cálculos e preços</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-red-400">✗</span> <span>Catálogo desatualizado, sem rastreabilidade</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-red-400">✗</span> <span>Cada vendedor com padrão diferente</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-red-400">✗</span> <span><strong>45%</strong> de taxa de conversão média do setor</span></li>
            </ul>
          </div>
          {/* Depois */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold text-emerald-700">Com STILLO IA — 12 meses de resultado</span>
            </div>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">✓</span> <span><strong>11 minutos</strong> do projeto ao orçamento pronto</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">✓</span> <span>IA lê a planta e extrai dimensões automaticamente</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">✓</span> <span><strong>94%</strong> dos itens gerados automaticamente (IA + regras)</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">✓</span> <span>Padrão único em toda a equipe, com aprendizado contínuo</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">✓</span> <span><strong>75%</strong> de conversão · R$ 7,5M em contratos aprovados</span></li>
            </ul>
          </div>
        </div>
      )}

      {/* FUNIL COMERCIAL */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Funil comercial <span className="text-xs font-normal text-muted-foreground">— do projeto ao orçamento aprovado</span></CardTitle></CardHeader>
        <CardContent className="space-y-2.5">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].valor : null;
            const conv = prev && prev > 0 ? Math.round((s.valor / prev) * 100) : null;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex w-36 shrink-0 items-center gap-2 text-sm">
                  <s.icon className="h-4 w-4 text-primary" /> {s.label}
                </div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
                  <div className="flex h-full items-center rounded-md bg-gradient-to-r from-primary to-sky-400 px-2 text-xs font-semibold text-white transition-all" style={{ width: `${Math.max(6, (s.valor / maxStage) * 100)}%` }}>
                    {s.valor}
                  </div>
                </div>
                <div className="w-12 shrink-0 text-right text-xs text-muted-foreground">{conv != null ? `${conv}%` : ''}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* TENDÊNCIA + STATUS */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" /> Evolução do valor orçado <span className="text-xs font-normal text-muted-foreground">(6 meses)</span></CardTitle></CardHeader>
          <CardContent>
            {tendencia.length === 0 ? <Vazio /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={tendencia} margin={{ left: 0, right: 8, top: 4 }}>
                  <defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PRIMARY} stopOpacity={0.4} /><stop offset="95%" stopColor={PRIMARY} stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" width={64} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} labelClassName="text-xs" />
                  <Area type="monotone" dataKey="valor" stroke={PRIMARY} fill="url(#gd)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Saúde do pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {porStatus.every((s) => s.total === 0) ? <Vazio /> : porStatus.map((s) => {
              const meta = STATUS_META[s.status] ?? { label: s.status, color: '#94a3b8' };
              return (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{s.total}</span>
                    <span className="w-20 text-right text-xs text-muted-foreground">{fmtK(s.valor)}</span>
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* RANKING + TOP CLIENTES */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Ranking de vendedores</CardTitle></CardHeader>
          <CardContent>
            {ranking.length === 0 ? <Vazio /> : (
              <ResponsiveContainer width="100%" height={Math.max(140, ranking.length * 44)}>
                <BarChart data={ranking} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" width={110} tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} />
                  <Bar dataKey="valor" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Top clientes <span className="text-xs font-normal text-muted-foreground">por valor</span></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topClientes.length === 0 ? <Vazio /> : topClientes.map((c, i) => (
              <div key={c.nome + i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{i + 1}</span>
                  {c.nome}
                </span>
                <span className="font-medium">{formatBRL(c.valor)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* IMPACTO DA IA + ATENÇÃO */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4 text-violet-600" /> Impacto da IA <span className="text-xs font-normal text-muted-foreground">origem dos itens</span></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {iaTotal === 0 ? <Vazio /> : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  <div style={{ width: `${(ia.itensIa / iaTotal) * 100}%`, backgroundColor: '#8b5cf6' }} title="IA + RAG" />
                  <div style={{ width: `${(ia.itensRegra / iaTotal) * 100}%`, backgroundColor: PRIMARY }} title="Motor de regras" />
                  <div style={{ width: `${(ia.itensManual / iaTotal) * 100}%`, backgroundColor: '#cbd5e1' }} title="Manual" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <Legenda cor="#8b5cf6" label="IA + RAG" valor={ia.itensIa} total={iaTotal} />
                  <Legenda cor={PRIMARY} label="Regras" valor={ia.itensRegra} total={iaTotal} />
                  <Legenda cor="#cbd5e1" label="Manual" valor={ia.itensManual} total={iaTotal} />
                </div>
                <div className="rounded-md bg-violet-50 p-2.5 text-sm text-violet-800">
                  <span className="font-semibold">{Math.round(((ia.itensIa + ia.itensRegra) / iaTotal) * 100)}%</span> dos itens vieram automatizados (IA + regras) · <span className="font-semibold">{ia.correcoes}</span> correções já alimentam o aprendizado.
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" /> Precisa de atenção</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Acao count={atencao.revisaoParada} to="/orcamentos" label="orçamento(s) em revisão parados" icon={FileText} />
            <Acao count={atencao.leiturasRevisar} to="/obras" label="leitura(s) com baixa confiança p/ revisar" icon={Sparkles} />
            <Acao count={atencao.obrasSemOrcamento} to="/obras" label="obra(s) ainda sem orçamento" icon={Building2} />
            {atencao.revisaoParada === 0 && atencao.leiturasRevisar === 0 && atencao.obrasSemOrcamento === 0 && (
              <p className="flex items-center gap-2 py-4 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Tudo em dia — nenhum gargalo no momento.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function Legenda({ cor, label, valor, total }: { cor: string; label: string; valor: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cor }} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-semibold">{total > 0 ? Math.round((valor / total) * 100) : 0}%</div>
      <div className="text-xs text-muted-foreground">{valor} itens</div>
    </div>
  );
}

function Acao({ count, to, label, icon: Icon }: { count: number; to: string; label: string; icon: typeof FileText }) {
  if (count === 0) return null;
  return (
    <Link to={to} className="flex items-center justify-between rounded-md border p-2.5 text-sm transition-colors hover:bg-accent">
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700"><Icon className="h-4 w-4" /></span>
        <span><span className="font-semibold">{count}</span> {label}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function Vazio() {
  return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda.</p>;
}
