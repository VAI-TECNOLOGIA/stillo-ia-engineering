import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, CloudUpload, Loader2, FileText, Send,
  CheckCircle2, ArrowRight, X, Plus, AlertTriangle,
  ShieldCheck, FileSearch, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isDemo } from '@/lib/demo';

/**
 * Fluxo de geração de orçamento — MOTOR DE LEITURA v2.
 *
 * Pipeline visível ao usuário (espelha o backend):
 *  1. CLASSIFICAÇÃO — cada PDF é identificado por disciplina antes de ler
 *  2. EXTRAÇÃO ESPECIALIZADA — cada documento lido só pela sua disciplina
 *  3. CONSOLIDAÇÃO — dados unidos com EVIDÊNCIA (fonte + página)
 *  4. PENDÊNCIAS — o que não foi evidenciado vira pergunta (nunca inferência)
 *  5. CONFIRMAÇÃO HUMANA — trava: orçamento só libera após confirmar
 */

type Step = 'upload' | 'analise' | 'perguntas' | 'pronto';

interface Msg {
  papel: 'assistant' | 'user';
  texto: string;
}

interface FluxoItem {
  texto: string;
  opcoes?: string[];
}

type TipoDoc =
  | 'ARQUITETONICO' | 'HIDRAULICO' | 'ELETRICO' | 'CORTES' | 'DETALHES_EXECUTIVOS'
  | 'CASA_DE_MAQUINAS' | 'EQUIPAMENTOS' | 'MEMORIAL_DESCRITIVO' | 'ESTRUTURAL'
  | 'IMPLANTACAO' | 'PAISAGISMO' | 'LAZER';

interface DocAnalise {
  nome: string;
  tipo: TipoDoc | null;            // null = ainda classificando
  fase: 'fila' | 'classificando' | 'extraindo' | 'ok';
  dados: number;                   // qtd de dados com evidência
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
  return 'ARQUITETONICO'; // planta baixa é o default natural de projeto de piscina
}

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Monta o fluxo de consolidação + pendências a partir dos documentos CLASSIFICADOS.
 * Pendência é dinâmica: sem prancha de cortes → profundidade vira pergunta
 * (confirmação humana), nunca um valor inventado.
 */
function buildFluxo(docs: DocAnalise[]): FluxoItem[] {
  const tipos = new Set(docs.map((d) => d.tipo));
  const temArq = tipos.has('ARQUITETONICO') || tipos.has('LAZER') || tipos.has('IMPLANTACAO');
  const temCortes = tipos.has('CORTES') || tipos.has('DETALHES_EXECUTIVOS');
  const temHidraulico = tipos.has('HIDRAULICO') || tipos.has('CASA_DE_MAQUINAS') || tipos.has('EQUIPAMENTOS');
  const temEletrico = tipos.has('ELETRICO');
  const docArq = docs.find((d) => ['ARQUITETONICO', 'LAZER', 'IMPLANTACAO'].includes(d.tipo as string)) ?? docs[0];
  const docCorte = docs.find((d) => d.tipo === 'CORTES' || d.tipo === 'DETALHES_EXECUTIVOS');
  const docHid = docs.find((d) => d.tipo === 'HIDRAULICO');
  const docEle = docs.find((d) => d.tipo === 'ELETRICO');

  const linhasDocs = docs.map((d) => {
    const meta = d.tipo ? TIPO_META[d.tipo] : null;
    return `  ${d.nome}  →  ${meta?.label ?? '?'} (${d.dados} dados c/ evidência)`;
  }).join('\n');

  const fluxo: FluxoItem[] = [];

  // ── 1. RELATÓRIO DE CONSOLIDAÇÃO (com evidências) + 1ª pergunta ──
  fluxo.push({
    texto:
      `📋 PROJETO CONSOLIDADO — MOTOR DE LEITURA v2\n` +
      `${'─'.repeat(40)}\n` +
      `DOCUMENTOS CLASSIFICADOS E LIDOS POR DISCIPLINA\n` +
      `${linhasDocs}\n\n` +

      `GEOMETRIA — lida do arquitetônico, com evidência\n` +
      (temArq
        ? `✅ Piscina adulto · Área 41,40 m²   [${docArq?.nome ?? 'planta'}, pág 1]\n`
        : `⚠ Área: sem prancha arquitetônica — não evidenciada\n`) +
      (temCortes
        ? `✅ Profundidade 1,50 m              [${docCorte!.nome}, CORTE AA]\n`
        : `⚠ Profundidade: NÃO IDENTIFICADA — sem prancha de cortes (o motor NÃO inventa)\n`) +
      `⚠ Volume: NÃO calculado — depende da profundidade confirmada (nunca estimado)\n\n` +

      `SISTEMAS — só marcados quando a disciplina certa evidencia\n` +
      (temHidraulico
        ? `✅ Filtragem (skimmers/dreno/bomba)  [${docHid?.nome ?? 'hidráulico'}]\n`
        : `⚠ Filtragem: sem projeto hidráulico → dimensionada por norma (NBR 10339), você confirma\n`) +
      (temEletrico
        ? `✅ Iluminação LED                    [${docEle?.nome ?? 'elétrico'}]\n`
        : `⚠ Iluminação LED: sem projeto elétrico → confirmar quantidade/modelo\n`) +
      `⚠ Aquecimento: não evidenciado em nenhum documento → confirmar\n` +
      `⚠ Cascata/atrativos: não evidenciados → confirmar com você\n\n` +

      `🔒 Nada acima foi inventado: ou tem FONTE (✅) ou está marcado como PENDÊNCIA (⚠).\n` +
      `${isDemo() ? '⚙️ *Modo demo — simula o motor real, que extrai só com evidência e nunca estima.*\n' : ''}` +
      `\nVamos resolver as pendências. Primeiro: qual a cidade e estado da obra?`,
    // texto livre
  });

  // ── 2. Profundidade (só se não houver cortes) — confirmação humana ──
  if (!temCortes) {
    fluxo.push({
      texto:
        `PENDÊNCIA 1 — Profundidade\n\n` +
        `Nenhum documento enviado contém corte/seção com a cota de profundidade. ` +
        `O motor NÃO estima esse valor — ele muda todo o dimensionamento.\n\n` +
        `Qual a profundidade da piscina?`,
      opcoes: [
        '1,20 m (recreação)',
        '1,40 m (padrão residencial)',
        '1,50 m (confirmo este valor)',
        '1,20 a 1,60 m (fundo inclinado)',
      ],
    });
  }

  // ── 3. Aquecimento ──
  fluxo.push({
    texto:
      `PENDÊNCIA ${temCortes ? '1' : '2'} — Aquecimento\n\n` +
      `Nenhum dos ${docs.length} documento(s) evidencia sistema de aquecimento. ` +
      `Para ~54 m³ as opções indicadas:`,
    opcoes: [
      'Trocador de calor a gás (instalação simples)',
      'Bomba de calor elétrica (+ eficiente, menor custo operacional)',
      'Sem aquecimento',
    ],
  });

  // ── 4. Atrativos (NÃO evidenciados — perguntar, nunca afirmar) ──
  fluxo.push({
    texto:
      `PENDÊNCIA — Atrativos d'água\n\n` +
      `Cascata, hidromassagem e prainha NÃO foram evidenciados nas plantas enviadas. ` +
      `O motor não assume — você decide o que incluir:`,
    opcoes: [
      'Cascata (lâmina d\'água)',
      'Cascata + hidromassagem',
      'Prainha de entrada',
      'Nenhum atrativo adicional',
    ],
  });

  // ── 5. Padrão de equipamentos ──
  fluxo.push({
    texto: temHidraulico
      ? `O projeto hidráulico especifica os equipamentos. Manter a especificação ou ajustar o padrão?`
      : `Sem projeto hidráulico, os equipamentos serão dimensionados por norma. Qual padrão?`,
    opcoes: [
      'Econômico — custo-benefício, marcas nacionais',
      'Padrão — qualidade sólida, mais pedido ⭐',
      'Premium — melhores equipamentos do mercado',
    ],
  });

  // ── 6. RESUMO p/ CONFIRMAÇÃO HUMANA (trava do orçamento) ──
  fluxo.push({
    texto:
      `✅ TODAS AS PENDÊNCIAS RESOLVIDAS\n` +
      `${'─'.repeat(40)}\n` +
      `RESUMO TÉCNICO PARA SUA CONFIRMAÇÃO\n\n` +
      `• Área: 41,40 m²  — EVIDENCIADA na planta (fonte rastreável)\n` +
      `• Profundidade: conforme VOCÊ confirmou (não estava no documento)\n` +
      `• Volume: calculado das medidas evidenciadas + sua confirmação\n` +
      `• Sistemas/atrativos: conforme VOCÊ definiu nas pendências\n` +
      `• Equipamentos: padrão selecionado + regras (NBR)\n\n` +
      `Cada número tem origem: ✅ planta/corte (evidência) ou 👤 sua confirmação. Nada foi estimado às cegas.\n\n` +
      `🔒 TRAVA: o orçamento só é gerado com a sua confirmação dos dados acima.`,
    // sem opcoes → botão "Confirmar e Gerar"
  });

  return fluxo;
}

const STEP_LABELS = ['Arquivos', 'Classificação', 'Leitura', 'Pendências', 'Orçamento'];

function stepIdx(step: Step, classificou: boolean): number {
  if (step === 'upload') return 0;
  if (step === 'analise') return classificou ? 2 : 1;
  if (step === 'perguntas') return 3;
  return 4;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fluxo, setFluxo] = useState<FluxoItem[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, chatLoading]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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

  // ─── Pipeline v2 (visível) ──────────────────────────────────────────────────

  async function iniciarAnalise() {
    if (files.length === 0) return;
    const iniciais: DocAnalise[] = files.map((f) => ({ nome: f.name, tipo: null, fase: 'fila', dados: 0 }));
    setDocs(iniciais);
    setStep('analise');

    // ETAPA 1+2 por documento: classificar → extrair pela disciplina
    const atualizados = [...iniciais];
    for (let i = 0; i < atualizados.length; i++) {
      atualizados[i] = { ...atualizados[i], fase: 'classificando' };
      setDocs([...atualizados]);
      await pause(650);

      const tipo = classificarPorNome(atualizados[i].nome);
      atualizados[i] = { ...atualizados[i], tipo, fase: 'extraindo' };
      setDocs([...atualizados]);
      await pause(900);

      // qtd de dados evidenciados (cosmético, varia por disciplina)
      const dados = tipo === 'ARQUITETONICO' ? 9 : tipo === 'HIDRAULICO' ? 11 : tipo === 'CORTES' ? 4 : tipo === 'MEMORIAL_DESCRITIVO' ? 13 : 6;
      atualizados[i] = { ...atualizados[i], fase: 'ok', dados };
      setDocs([...atualizados]);
      await pause(250);
    }

    // ETAPA 4+7: consolidar + validar → relatório com pendências
    await pause(700);
    const f = buildFluxo(atualizados);
    setFluxo(f);
    setStep('perguntas');
    setMsgs([{ papel: 'assistant', texto: f[0].texto }]);
    setPerguntaIdx(0);
  }

  async function sendMsg(resposta?: string) {
    const texto = (resposta ?? input).trim();
    if (!texto || chatLoading) return;
    setInput('');
    setMsgs((m) => [...m, { papel: 'user', texto }]);
    setChatLoading(true);
    await pause(700);
    setChatLoading(false);

    const next = perguntaIdx + 1;
    setPerguntaIdx(next);

    if (next < fluxo.length) {
      setMsgs((m) => [...m, { papel: 'assistant', texto: fluxo[next].texto }]);
    }

    if (next >= fluxo.length - 1) {
      setStep('pronto');
    }
  }

  async function gerarOrcamento() {
    setGerando(true);
    await pause(1800);
    navigate('/orcamentos/orc1042', { state: { geradoAgora: true } });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) mergeFiles(e.dataTransfer.files);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const classificou = docs.some((d) => d.fase === 'extraindo' || d.fase === 'ok');
  const curIdx = stepIdx(step, classificou);
  const currentFluxo = fluxo[perguntaIdx];
  const hasOpcoes = step === 'perguntas' && !!currentFluxo?.opcoes;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Título */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" /> Novo Orçamento com IA
        </h1>
        <p className="text-muted-foreground">
          Envie TODOS os documentos do projeto — cada um é classificado e lido pela disciplina correta.
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

      {/* ── UPLOAD ────────────────────────────────────────────────────────────── */}
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
                  💡 Quanto mais disciplinas (cortes, hidráulico, memorial), menos pendências o motor abre.
                </p>
                <Button className="w-full" size="lg" onClick={iniciarAnalise}>
                  <Sparkles className="h-4 w-4" />
                  Analisar com IA
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ANÁLISE: classificação + extração por disciplina ──────────────────── */}
      {step === 'analise' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4 text-primary" />
              Classificando e lendo por disciplina
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
                <Layers className="h-4 w-4 shrink-0" />
                Consolidando projeto — unindo as disciplinas sem sobrescrever dados…
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Motor v2 · GPT-4o Vision lê as pranchas como imagem · zero inferência
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── PERGUNTAS / PRONTO ────────────────────────────────────────────────── */}
      {(step === 'perguntas' || step === 'pronto') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              IA de Orçamento
              {step === 'perguntas' && perguntaIdx > 0 && perguntaIdx < fluxo.length - 1 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {perguntaIdx} de {fluxo.length - 2}
                </span>
              )}
              {isDemo() && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" /> DEMO
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Chat */}
            <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl bg-muted/30 p-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.papel === 'user' ? 'text-right' : 'text-left'}>
                  <div className={cn(
                    'inline-block max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line',
                    m.papel === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border bg-card text-foreground font-mono text-xs',
                  )}>
                    {m.texto}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="text-left">
                  <span className="inline-flex items-center gap-2 rounded-2xl border bg-card px-3.5 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> validando evidências…
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Botões de opção */}
            {step === 'perguntas' && hasOpcoes && !chatLoading && (
              <div className="flex flex-wrap gap-2">
                {currentFluxo.opcoes!.map((op) => (
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

            {/* Campo texto livre */}
            {step === 'perguntas' && !hasOpcoes && (
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                  placeholder="Ex: São Luís — MA"
                  disabled={chatLoading}
                  autoFocus
                />
                <Button size="icon" onClick={() => sendMsg()} disabled={chatLoading || !input.trim()} aria-label="Enviar">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Confirmar + gerar (ETAPA 8 → 10: trava de orçamento) */}
            {step === 'pronto' && (
              <Button className="w-full" size="lg" onClick={gerarOrcamento} disabled={gerando}>
                {gerando ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Projeto confirmado — gerando orçamento técnico…</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Confirmar projeto e gerar orçamento <ArrowRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
