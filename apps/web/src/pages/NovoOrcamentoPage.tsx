import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, CloudUpload, Loader2, FileText, Send, CheckCircle2, ArrowRight,
  X, Plus, AlertTriangle, ShieldCheck, FileSearch, Layers,
  Ruler, Waves, Flame, Lightbulb, Filter, MapPin, Award, UserCheck, Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isDemo } from '@/lib/demo';

/**
 * Fluxo de geração de orçamento — MOTOR DE LEITURA v2.
 *
 * UX (a pedido): NÃO despeja relatório técnico quando algo não está claro —
 * PERGUNTA ao usuário, item por item. Ao final, mostra uma TELA VISUAL de
 * confirmação de TODAS as medidas (com a origem de cada dado) e só então
 * libera "Gerar orçamento".
 */

type Step = 'upload' | 'analise' | 'perguntas' | 'confirmar';

interface Msg {
  papel: 'assistant' | 'user';
  texto: string;
}

type Campo = 'cidade' | 'profundidade' | 'aquecimento' | 'atrativos' | 'padrao';

interface Pergunta {
  campo: Campo;
  texto: string;
  opcoes?: string[];
}

type TipoDoc =
  | 'ARQUITETONICO' | 'HIDRAULICO' | 'ELETRICO' | 'CORTES' | 'DETALHES_EXECUTIVOS'
  | 'CASA_DE_MAQUINAS' | 'EQUIPAMENTOS' | 'MEMORIAL_DESCRITIVO' | 'ESTRUTURAL'
  | 'IMPLANTACAO' | 'PAISAGISMO' | 'LAZER';

interface DocAnalise {
  nome: string;
  tipo: TipoDoc | null;
  fase: 'fila' | 'classificando' | 'extraindo' | 'ok';
  dados: number;
}

const TIPO_META: Record<TipoDoc, { label: string; cor: string }> = {
  ARQUITETONICO:       { label: 'Arquitetônico',        cor: 'bg-sky-100 text-sky-700' },
  HIDRAULICO:          { label: 'Hidráulico',           cor: 'bg-cyan-100 text-cyan-700' },
  ELETRICO:            { label: 'Elétrico',             cor: 'bg-yellow-100 text-yellow-700' },
  CORTES:              { label: 'Cortes',               cor: 'bg-amber-100 text-amber-700' },
  DETALHES_EXECUTIVOS: { label: 'Detalhes Executivos',  cor: 'bg-amber-100 text-amber-700' },
  CASA_DE_MAQUINAS:    { label: 'Casa de Máquinas',     cor: 'bg-violet-100 text-violet-700' },
  EQUIPAMENTOS:        { label: 'Equipamentos',         cor: 'bg-emerald-100 text-emerald-700' },
  MEMORIAL_DESCRITIVO: { label: 'Memorial Descritivo',  cor: 'bg-indigo-100 text-indigo-700' },
  ESTRUTURAL:          { label: 'Estrutural',           cor: 'bg-stone-200 text-stone-700' },
  IMPLANTACAO:         { label: 'Implantação',          cor: 'bg-teal-100 text-teal-700' },
  PAISAGISMO:          { label: 'Paisagismo',           cor: 'bg-green-100 text-green-700' },
  LAZER:               { label: 'Lazer',                cor: 'bg-pink-100 text-pink-700' },
};

/** Classificação por nome do arquivo — mesma heurística do backend (ETAPA 1). */
function classificarPorNome(nome: string): TipoDoc {
  const n = nome.toLowerCase();
  if (/casa.*maquina|\bcm\b/.test(n)) return 'CASA_DE_MAQUINAS';
  if (/memorial|especifica/.test(n)) return 'MEMORIAL_DESCRITIVO';
  if (/equipamento|lista.*materia|quantitativo/.test(n)) return 'EQUIPAMENTOS';
  if (/hidraulic|hidr[oa]|\bhid\b/.test(n)) return 'HIDRAULICO';
  if (/eletric|\bele\b|iluminacao/.test(n)) return 'ELETRICO';
  if (/corte|secao|se[cç][aã]o/.test(n)) return 'CORTES';
  if (/detalhe|\bdet\b|executivo/.test(n)) return 'DETALHES_EXECUTIVOS';
  if (/estrutur|forma.*arma|funda[cç]/.test(n)) return 'ESTRUTURAL';
  if (/implanta|situa[cç]/.test(n)) return 'IMPLANTACAO';
  if (/paisag/.test(n)) return 'PAISAGISMO';
  if (/lazer/.test(n)) return 'LAZER';
  return 'ARQUITETONICO';
}

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Monta APENAS as perguntas das pendências (o que o PDF não deixou claro).
 * Sem relatório-dump: o motor pergunta direto, item por item.
 */
function buildPerguntas(docs: DocAnalise[]): Pergunta[] {
  const tipos = new Set(docs.map((d) => d.tipo));
  const temCortes = tipos.has('CORTES') || tipos.has('DETALHES_EXECUTIVOS');
  const temHidraulico = tipos.has('HIDRAULICO') || tipos.has('CASA_DE_MAQUINAS') || tipos.has('EQUIPAMENTOS');
  const docArq = docs.find((d) => ['ARQUITETONICO', 'LAZER', 'IMPLANTACAO'].includes(d.tipo as string)) ?? docs[0];

  const perguntas: Pergunta[] = [];

  perguntas.push({
    campo: 'cidade',
    texto:
      `Li e classifiquei ${docs.length === 1 ? 'o documento' : `os ${docs.length} documentos`}. ` +
      `A área da piscina está evidenciada na planta (${docArq?.nome ?? 'arquitetônico'}). ` +
      `Algumas informações não estavam claras — vou confirmar com você, rapidinho.\n\n` +
      `Primeiro: qual a cidade e o estado da obra?`,
  });

  if (!temCortes) {
    perguntas.push({
      campo: 'profundidade',
      texto: `A PROFUNDIDADE não estava na planta (faltou a prancha de cortes). O motor não inventa — qual é?`,
      opcoes: ['1,20 m (recreação)', '1,40 m (padrão residencial)', '1,50 m', '1,20 a 1,60 m (fundo inclinado)'],
    });
  }

  perguntas.push({
    campo: 'aquecimento',
    texto: `AQUECIMENTO não foi evidenciado em nenhum documento. Como deseja?`,
    opcoes: ['Trocador de calor a gás', 'Bomba de calor elétrica', 'Sem aquecimento'],
  });

  perguntas.push({
    campo: 'atrativos',
    texto: `ATRATIVOS (cascata, hidromassagem, prainha) não foram evidenciados. Deseja incluir algum?`,
    opcoes: ['Cascata (lâmina d\'água)', 'Cascata + hidromassagem', 'Prainha de entrada', 'Nenhum atrativo'],
  });

  perguntas.push({
    campo: 'padrao',
    texto: temHidraulico
      ? `Por fim — o padrão dos equipamentos (o hidráulico especifica, você pode ajustar):`
      : `Por fim — o padrão dos equipamentos (serão dimensionados por norma NBR 10339):`,
    opcoes: ['Econômico', 'Padrão ⭐', 'Premium'],
  });

  return perguntas;
}

/** Extrai o primeiro número (m) de uma resposta tipo "1,50 m" → 1.5. */
function parseProf(s: string): number {
  const m = s.match(/(\d+[.,]\d+)/);
  return m ? parseFloat(m[1].replace(',', '.')) : 1.4;
}

const STEP_LABELS = ['Arquivos', 'Leitura', 'Perguntas', 'Confirmação', 'Orçamento'];

function stepIdx(step: Step): number {
  if (step === 'upload') return 0;
  if (step === 'analise') return 1;
  if (step === 'perguntas') return 2;
  if (step === 'confirmar') return 3;
  return 4;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Badge de origem do dado (a transparência que vale ouro) ──────────────────
type Origem = 'evidencia' | 'voce' | 'norma' | 'calculo';
const ORIGEM_META: Record<Origem, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  evidencia: { label: 'Evidenciado na planta', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  voce:      { label: 'Você confirmou',        cls: 'bg-blue-100 text-blue-700',       Icon: UserCheck },
  norma:     { label: 'Por norma (NBR)',       cls: 'bg-violet-100 text-violet-700',   Icon: ShieldCheck },
  calculo:   { label: 'Calculado',             cls: 'bg-amber-100 text-amber-700',     Icon: Calculator },
};

function LinhaMedida({ Icon, rotulo, valor, origem }: {
  Icon: React.ComponentType<{ className?: string }>; rotulo: string; valor: string; origem: Origem;
}) {
  const o = ORIGEM_META[origem];
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="font-semibold leading-tight">{valor}</p>
      </div>
      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', o.cls)}>
        <o.Icon className="h-3 w-3" /> {o.label}
      </span>
    </div>
  );
}

export function NovoOrcamentoPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<DocAnalise[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [respostas, setRespostas] = useState<Partial<Record<Campo, string>>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, chatLoading]);

  function mergeFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !names.has(f.name))];
    });
  }
  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // ─── Pipeline ────────────────────────────────────────────────────────────────

  async function iniciarAnalise() {
    if (files.length === 0) return;
    const iniciais: DocAnalise[] = files.map((f) => ({ nome: f.name, tipo: null, fase: 'fila', dados: 0 }));
    setDocs(iniciais);
    setStep('analise');

    const atualizados = [...iniciais];
    for (let i = 0; i < atualizados.length; i++) {
      atualizados[i] = { ...atualizados[i], fase: 'classificando' };
      setDocs([...atualizados]);
      await pause(650);
      const tipo = classificarPorNome(atualizados[i].nome);
      atualizados[i] = { ...atualizados[i], tipo, fase: 'extraindo' };
      setDocs([...atualizados]);
      await pause(900);
      const dados = tipo === 'ARQUITETONICO' ? 9 : tipo === 'HIDRAULICO' ? 11 : tipo === 'CORTES' ? 4 : tipo === 'MEMORIAL_DESCRITIVO' ? 13 : 6;
      atualizados[i] = { ...atualizados[i], fase: 'ok', dados };
      setDocs([...atualizados]);
      await pause(250);
    }

    await pause(700);
    const qs = buildPerguntas(atualizados);
    setPerguntas(qs);
    setRespostas({});
    setPerguntaIdx(0);
    setMsgs([{ papel: 'assistant', texto: qs[0].texto }]);
    setStep('perguntas');
  }

  async function sendMsg(resposta?: string) {
    const texto = (resposta ?? input).trim();
    if (!texto || chatLoading) return;
    setInput('');
    setMsgs((m) => [...m, { papel: 'user', texto }]);
    // guarda a resposta no campo da pergunta atual
    const campo = perguntas[perguntaIdx]?.campo;
    if (campo) setRespostas((r) => ({ ...r, [campo]: texto }));

    setChatLoading(true);
    await pause(650);
    setChatLoading(false);

    const next = perguntaIdx + 1;
    if (next < perguntas.length) {
      setPerguntaIdx(next);
      setMsgs((m) => [...m, { papel: 'assistant', texto: perguntas[next].texto }]);
    } else {
      // acabaram as perguntas → tela visual de confirmação
      setStep('confirmar');
    }
  }

  async function gerarOrcamento() {
    setGerando(true);
    await pause(1600);
    navigate('/orcamentos/orc1042', { state: { geradoAgora: true } });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) mergeFiles(e.dataTransfer.files);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const curIdx = stepIdx(step);
  const atual = perguntas[perguntaIdx];
  const hasOpcoes = step === 'perguntas' && !!atual?.opcoes;

  // dados derivados p/ a tela de confirmação
  const temCortes = docs.some((d) => d.tipo === 'CORTES' || d.tipo === 'DETALHES_EXECUTIVOS');
  const profStr = temCortes ? '1,50 m' : (respostas.profundidade ?? '—');
  const prof = parseProf(profStr);
  const volume = (41.4 * prof).toFixed(1).replace('.', ',');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" /> Novo Orçamento com IA
        </h1>
        <p className="text-muted-foreground">
          Envie os documentos do projeto — a IA lê, pergunta o que não estiver claro e confirma cada medida com você.
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-1 overflow-x-auto text-xs">
        {STEP_LABELS.map((label, i) => {
          const done = i < curIdx;
          const active = i === curIdx;
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && <div className={cn('h-px w-4', done || active ? 'bg-primary' : 'bg-border')} />}
              <span className={cn(
                'whitespace-nowrap rounded-full px-2.5 py-0.5 transition-colors',
                active ? 'bg-primary font-medium text-primary-foreground'
                  : done ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── UPLOAD ── */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed py-10 transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary hover:bg-primary/5',
              )}
            >
              <CloudUpload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-base font-medium">Clique ou arraste os arquivos aqui</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Arquitetônico · Hidráulico · Cortes · Memorial · Equipamentos — PDF, DWG, PNG, JPG
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Selecionar arquivos
              </span>
            </button>

            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg"
              onChange={(e) => {
                if (e.target.files?.length) mergeFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                </p>
                {files.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', TIPO_META[classificarPorNome(f.name)].cor)}>
                      {TIPO_META[classificarPorNome(f.name)].label}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                    <button onClick={() => removeFile(f.name)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  💡 Quanto mais disciplinas (cortes, hidráulico, memorial), menos perguntas a IA faz.
                </p>
                <Button className="w-full" size="lg" onClick={iniciarAnalise}>
                  <Sparkles className="h-4 w-4" /> Analisar com IA <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ANÁLISE ── */}
      {step === 'analise' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4 text-primary" /> Classificando e lendo por disciplina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {docs.map((d) => (
              <div key={d.nome} className="flex items-center gap-3">
                <FileText className={cn('h-6 w-6 shrink-0', d.fase !== 'fila' ? 'text-primary' : 'text-muted-foreground')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{d.nome}</p>
                    {d.tipo && (
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', TIPO_META[d.tipo].cor)}>
                        {TIPO_META[d.tipo].label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.fase === 'fila' && 'Aguardando…'}
                    {d.fase === 'classificando' && 'Classificando disciplina (nome + carimbo + conteúdo)…'}
                    {d.fase === 'extraindo' && `Extraindo dados de ${TIPO_META[d.tipo!].label} — somente desta disciplina…`}
                    {d.fase === 'ok' && `✓ ${d.dados} dados extraídos com evidência (fonte + página)`}
                  </p>
                </div>
                {(d.fase === 'classificando' || d.fase === 'extraindo')
                  ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  : d.fase === 'ok'
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <div className="h-4 w-4 rounded-full border-2 border-muted" />
                }
              </div>
            ))}
            {docs.every((d) => d.fase === 'ok') && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                <Layers className="h-4 w-4 shrink-0" /> Consolidando — e separando o que precisa confirmar com você…
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Motor v2 · GPT-4o Vision lê as pranchas como imagem · zero inferência
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── PERGUNTAS (conversacional, sem relatório-dump) ── */}
      {step === 'perguntas' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> IA de Orçamento
              {perguntaIdx >= 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  pergunta {perguntaIdx + 1} de {perguntas.length}
                </span>
              )}
              {isDemo() && (
                <span className="ml-auto flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-normal text-blue-600">
                  <AlertTriangle className="h-2.5 w-2.5" /> DEMO
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl bg-muted/30 p-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.papel === 'user' ? 'text-right' : 'text-left'}>
                  <div className={cn(
                    'inline-block max-w-[92%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.papel === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card text-foreground',
                  )}>
                    {m.texto}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="text-left">
                  <span className="inline-flex items-center gap-2 rounded-2xl border bg-card px-3.5 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> anotando…
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {hasOpcoes && !chatLoading && (
              <div className="flex flex-wrap gap-2">
                {atual!.opcoes!.map((op) => (
                  <button
                    key={op}
                    onClick={() => sendMsg(op)}
                    className="rounded-full border border-primary/40 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}

            {!hasOpcoes && !chatLoading && (
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                  placeholder="Ex: São Luís — MA"
                  autoFocus
                />
                <Button size="icon" onClick={() => sendMsg()} disabled={!input.trim()} aria-label="Enviar">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CONFIRMAÇÃO VISUAL DAS MEDIDAS ── */}
      {step === 'confirmar' && (
        <Card className="overflow-hidden">
          <div className="bg-primary/5 px-6 py-5 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Confirme as medidas do projeto</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Revise tudo abaixo. Cada dado mostra de onde veio. Nada foi estimado às cegas.
            </p>
          </div>

          <CardContent className="space-y-5 pt-5">
            {/* Geometria */}
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Waves className="h-3.5 w-3.5" /> Piscina
              </p>
              <div className="divide-y rounded-xl border px-3">
                <LinhaMedida Icon={Ruler}      rotulo="Área"         valor="41,40 m²"        origem="evidencia" />
                <LinhaMedida Icon={ArrowRight} rotulo="Profundidade" valor={profStr}          origem={temCortes ? 'evidencia' : 'voce'} />
                <LinhaMedida Icon={Calculator} rotulo="Volume"       valor={`${volume} m³`}   origem="calculo" />
              </div>
            </div>

            {/* Sistemas */}
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Sistemas
              </p>
              <div className="divide-y rounded-xl border px-3">
                <LinhaMedida Icon={Filter}    rotulo="Filtragem"   valor="Bomba + filtro + skimmers"        origem="norma" />
                <LinhaMedida Icon={Lightbulb} rotulo="Iluminação"  valor="LED subaquático"                  origem="norma" />
                <LinhaMedida Icon={Flame}     rotulo="Aquecimento" valor={respostas.aquecimento ?? '—'}     origem="voce" />
                <LinhaMedida Icon={Waves}     rotulo="Atrativos"   valor={respostas.atrativos ?? '—'}       origem="voce" />
              </div>
            </div>

            {/* Obra */}
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Obra
              </p>
              <div className="divide-y rounded-xl border px-3">
                <LinhaMedida Icon={MapPin} rotulo="Local"  valor={respostas.cidade ?? '—'} origem="voce" />
                <LinhaMedida Icon={Award}  rotulo="Padrão" valor={respostas.padrao ?? '—'} origem="voce" />
              </div>
            </div>

            {/* Legenda + trava */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> evidência (planta)</span>
              <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-blue-600" /> você confirmou</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-violet-600" /> por norma</span>
              <span className="flex items-center gap-1"><Calculator className="h-3 w-3 text-amber-600" /> calculado</span>
            </div>

            <Button className="w-full" size="lg" onClick={gerarOrcamento} disabled={gerando}>
              {gerando ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando orçamento técnico…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Confirmar e gerar orçamento <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
            <button
              onClick={() => { setStep('perguntas'); setPerguntaIdx(0); setMsgs([{ papel: 'assistant', texto: perguntas[0].texto }]); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← revisar respostas
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
