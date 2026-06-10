import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Ruler, Zap, Loader2, FileText, Cpu, Search, Sparkles, CheckCircle2, Waves, BookOpen, Settings2,
} from 'lucide-react';
import { obrasApi } from '@/lib/obras.api';
import { dimensionamentoApi, type DimItem } from '@/lib/dimensionamento.api';
import { orcamentosApi } from '@/lib/orcamentos.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';

/** Perguntas de personalização que a IA faz após ler a planta. */
const PERGUNTAS: { id: string; label: string; opcoes: string[]; default: string }[] = [
  { id: 'borda', label: 'Tipo de borda', opcoes: ['Comum', 'Infinita'], default: 'Infinita' },
  { id: 'aquecimento', label: 'Aquecimento o ano todo?', opcoes: ['Sim', 'Não'], default: 'Sim' },
  { id: 'prainha', label: 'Prainha / área molhada?', opcoes: ['Sim', 'Não'], default: 'Sim' },
  { id: 'tratamento', label: 'Tratamento da água', opcoes: ['Sal', 'Cloro'], default: 'Sal' },
  { id: 'hidro', label: 'Hidromassagem / SPA?', opcoes: ['Sim', 'Não'], default: 'Não' },
  { id: 'cascata', label: 'Cascata?', opcoes: ['Sim', 'Não'], default: 'Não' },
];

export function DimensionamentoPage() {
  const { obraId = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [respostas, setRespostas] = useState<Record<string, string>>(
    Object.fromEntries(PERGUNTAS.map((p) => [p.id, p.default])),
  );

  const obra = useQuery({ queryKey: ['obra', obraId], queryFn: () => obrasApi.get(obraId) });
  const dim = useQuery({
    queryKey: ['dimensionamento', obraId],
    queryFn: () => dimensionamentoApi.obter(obraId),
    refetchInterval: (q) => { const s = q.state.data?.status; return s === 'PENDENTE' || s === 'PROCESSANDO' ? 1500 : false; },
    refetchIntervalInBackground: true,
  });

  const gerar = useMutation({
    mutationFn: () => dimensionamentoApi.gerar(obraId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dimensionamento', obraId] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ['dimensionamento', obraId] }), 2600);
    },
  });
  const montarOrcamento = useMutation({
    mutationFn: () => orcamentosApi.criarDaObra(obraId),
    onSuccess: (orc) => navigate(`/orcamentos/${orc.id}`),
  });

  const piscina = (obra.data?.piscinas ?? [])[0];
  const litros = piscina ? Math.round((piscina.comprimentoM ?? 0) * (piscina.larguraM ?? 0) * (piscina.profundidadeM ?? 0) * 1000) : 0;
  const itens = dim.data?.itens ?? [];
  const grupos = agrupar(itens);
  const avisos = (dim.data?.resumo?.avisos ?? []) as string[];
  const total = itens.reduce((s, it) => s + (it.precoUnit ?? 0) * it.quantidade, 0);
  const status = dim.data?.status;
  const processando = status === 'PENDENTE' || status === 'PROCESSANDO' || gerar.isPending;
  const concluido = status === 'CONCLUIDO';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/obras/${obraId}/leitura`}><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" /> Dimensionamento por IA
          </h1>
          <p className="text-muted-foreground">{obra.data?.nome ?? 'Obra'} — a IA monta todos os equipamentos do orçamento a partir da planta + regras + catálogo.</p>
        </div>
      </div>

      {/* 1 — Projeto lido pela IA */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> 1 · Projeto lido pela IA</CardTitle></CardHeader>
        <CardContent>
          {!piscina ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma piscina lida ainda. Comece pela <Link className="text-primary underline" to={`/obras/${obraId}/leitura`}>Leitura Inteligente</Link> (anexe a planta em PDF).
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2 text-lg font-semibold"><Waves className="h-5 w-5 text-primary" /> {piscina.nome}</div>
              <Fato label="Dimensões" valor={`${fmt(piscina.comprimentoM)} × ${fmt(piscina.larguraM)} × ${fmt(piscina.profundidadeM)} m`} />
              <Fato label="Volume" valor={`${litros.toLocaleString('pt-BR')} L`} destaque />
              <Fato label="Confiança da leitura" valor={`${Math.round((piscina.confiancaLeitura ?? 0.9) * 100)}%`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2 — Personalização (a IA pergunta) */}
      {piscina && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary" /> 2 · Personalização do projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">A IA leu o projeto e fez algumas perguntas. Ajuste se necessário — as respostas + as regras pré-definidas montam os equipamentos.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PERGUNTAS.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">{p.label}</div>
                  <div className="flex gap-1.5">
                    {p.opcoes.map((op) => {
                      const on = respostas[p.id] === op;
                      return (
                        <button key={op} type="button" onClick={() => setRespostas((r) => ({ ...r, [p.id]: op }))}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background text-muted-foreground hover:bg-accent'}`}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-1">
              <Button size="lg" onClick={() => gerar.mutate()} disabled={processando}>
                {processando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                {processando ? 'Calculando...' : concluido ? 'Recalcular dimensionamento' : 'GERAR DIMENSIONAMENTO'}
              </Button>
              {gerar.isError && <p className="mt-2 text-sm text-destructive">Falha ao gerar.</p>}
            </div>
            {processando && <ProcessandoPanel />}
          </CardContent>
        </Card>
      )}

      {/* 3 — Resultado (idêntico ao modelo de orçamento) */}
      {concluido && itens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 3 · Dimensionamento — {itens.length} itens</span>
              <span className="text-sm font-normal text-muted-foreground">Total estimado: <span className="text-base font-bold text-foreground">{formatBRL(total)}</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {Object.entries(grupos).map(([categoria, lista]) => {
              const subtotal = lista.reduce((s, it) => s + (it.precoUnit ?? 0) * it.quantidade, 0);
              return (
                <div key={categoria}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-sm font-semibold uppercase tracking-wide text-primary">{categoria}</div>
                    <div className="text-xs text-muted-foreground">subtotal <span className="font-semibold text-foreground">{formatBRL(subtotal)}</span></div>
                  </div>
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="w-12 p-2 text-left font-medium">Qtd</th>
                          <th className="p-2 text-left font-medium">Descrição</th>
                          <th className="hidden p-2 text-left font-medium md:table-cell">Como a IA definiu</th>
                          <th className="w-24 p-2 text-right font-medium">Vlr unit.</th>
                          <th className="w-28 p-2 text-right font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map((it) => (
                          <tr key={it.id} className="border-t">
                            <td className="p-2 align-top font-medium">{it.quantidade}<span className="ml-0.5 text-xs text-muted-foreground">{it.unidade}</span></td>
                            <td className="p-2 align-top">
                              <div>{it.descricao}</div>
                              {it.produtoSugerido && <div className="mt-0.5 text-xs text-muted-foreground">SKU <span className="font-mono">{it.produtoSugerido.sku}</span></div>}
                              <div className="mt-1 md:hidden"><Definicao texto={it.definicao} /></div>
                            </td>
                            <td className="hidden p-2 align-top md:table-cell"><Definicao texto={it.definicao} /></td>
                            <td className="p-2 text-right align-top tabular-nums text-muted-foreground">{formatBRL(it.precoUnit ?? 0)}</td>
                            <td className="p-2 text-right align-top font-medium tabular-nums">{formatBRL((it.precoUnit ?? 0) * it.quantidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {avisos.length > 0 && (
              <ul className="list-inside list-disc rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                {avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-lg font-bold">Total estimado: <span className="text-primary">{formatBRL(total)}</span></div>
              <Button size="lg" onClick={() => montarOrcamento.mutate()} disabled={montarOrcamento.isPending}>
                {montarOrcamento.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Gerar orçamento →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Fato({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${destaque ? 'text-primary' : ''}`}>{valor}</div>
    </div>
  );
}

function Definicao({ texto }: { texto?: string }) {
  const t = texto ?? 'Regra pré-definida';
  const isCat = /catálogo/i.test(t) && !/regra/i.test(t);
  const isAmbos = /\+/.test(t);
  const cls = isAmbos ? 'bg-violet-100 text-violet-700' : isCat ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700';
  const Icon = isCat || isAmbos ? BookOpen : Ruler;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}><Icon className="h-3 w-3" /> {t}</span>;
}

function ProcessandoPanel() {
  return (
    <div className="mt-1 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-sky-700"><Loader2 className="h-4 w-4 animate-spin" /> Rodando o motor de engenharia comercial...</div>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Derivando volume, área e perímetro (84.000 L)</li>
        <li className="flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" /> Aplicando regras (filtragem, iluminação, borda infinita, aquecimento…)</li>
        <li className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Selecionando produtos e preços no catálogo técnico (RAG)</li>
      </ul>
    </div>
  );
}

function fmt(n?: number | null): string {
  return n == null ? '?' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function agrupar(itens: DimItem[]): Record<string, DimItem[]> {
  return itens.reduce<Record<string, DimItem[]>>((acc, it) => {
    (acc[it.categoria] = acc[it.categoria] ?? []).push(it);
    return acc;
  }, {});
}
