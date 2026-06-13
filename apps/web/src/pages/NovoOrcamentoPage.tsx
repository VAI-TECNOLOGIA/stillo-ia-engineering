import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, CloudUpload, Loader2, FileText, Send, CheckCircle2, ArrowRight,
  X, Plus, AlertTriangle, ShieldCheck, FileSearch, Layers,
  Ruler, Waves, Flame, Lightbulb, Filter, Award, UserCheck, Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isDemo } from '@/lib/demo';
import { diagLog, diagErro } from '@/lib/diag';
import { leituraApi } from '@/lib/leitura.api';
import {
  analiseApi, type ProjectAnalysisV2, type CorpoDagua, type CampoResolvivel, type CampoEvid,
} from '@/lib/analise.api';

/**
 * Fluxo de geração de orçamento — MOTOR DE LEITURA v2.
 *
 * UX (a pedido): NÃO despeja relatório técnico quando algo não está claro —
 * PERGUNTA ao usuário, item por item. Ao final, mostra uma TELA VISUAL de
 * confirmação de TODAS as medidas (com a origem de cada dado) e só então
 * libera a confirmação/orçamento.
 *
 * DOIS MODOS:
 *  - DEMO (VITE_DEMO=true): simulação local (vendas) — nada vai pra API.
 *  - REAL: upload → análise com CONSENSO 3-IA no backend → pendências e
 *    divergências REAIS viram perguntas → respostas viram evidência
 *    CONFIRMACAO_HUMANA → confirmação libera o orçamento. Tudo logado (diag).
 */

type Step = 'upload' | 'analise' | 'perguntas' | 'confirmar';

interface Msg {
  papel: 'assistant' | 'user';
  texto: string;
}

interface Pergunta {
  campo: string; // 'aquecimento' | 'atrativos' | 'padrao' | 'profundidade' | 'resolver:<alvo>:<campo>'
  /** Mensagens CURTAS que precedem a pergunta (efeito de conversa, uma bolha por vez). */
  intro?: string[];
  texto: string;
  opcoes?: string[];
  /** Pergunta real que vira evidência CONFIRMACAO_HUMANA via PATCH /resolver. */
  resolve?: { alvo: string; campo: CampoResolvivel };
}

type TipoDoc =
  | 'ARQUITETONICO' | 'HIDRAULICO' | 'ELETRICO' | 'CORTES' | 'DETALHES_EXECUTIVOS'
  | 'CASA_DE_MAQUINAS' | 'EQUIPAMENTOS' | 'MEMORIAL_DESCRITIVO' | 'ESTRUTURAL'
  | 'IMPLANTACAO' | 'PAISAGISMO' | 'LAZER';

interface DocAnalise {
  nome: string;
  tipo: TipoDoc | null;
  fase: 'fila' | 'classificando' | 'extraindo' | 'ok' | 'falha';
  dados: number;
  modeloIa?: string | null;
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

function tipoMeta(tipo: string | null): { label: string; cor: string } {
  if (tipo && tipo in TIPO_META) return TIPO_META[tipo as TipoDoc];
  return { label: tipo ?? 'Documento', cor: 'bg-muted text-muted-foreground' };
}

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
 * DEMO — só o que importa pro ORÇAMENTO (nada de cadastro/cidade). Mensagens
 * curtas, em tom de conversa: a primeira pergunta carrega a intro da leitura.
 */
function buildPerguntasDemo(docs: DocAnalise[]): Pergunta[] {
  const tipos = new Set(docs.map((d) => d.tipo));
  const temCortes = tipos.has('CORTES') || tipos.has('DETALHES_EXECUTIVOS');

  const perguntas: Pergunta[] = [];
  // 1 bolha só: nada que não seja insumo do orçamento.
  const intro = [
    `Li ${docs.length === 1 ? 'o documento' : `os ${docs.length} documentos`}! ✅ Vou confirmar só o que falta pro orçamento:`,
  ];

  if (!temCortes) {
    perguntas.push({
      campo: 'profundidade',
      intro,
      texto: `A profundidade não está na planta (faltou a prancha de cortes). Qual é?`,
      opcoes: ['1,20 m (recreação)', '1,40 m (padrão residencial)', '1,50 m', '1,20 a 1,60 m (fundo inclinado)'],
    });
  }

  perguntas.push({
    campo: 'aquecimento',
    ...(perguntas.length === 0 ? { intro } : {}),
    texto: `Aquecimento — como prefere?`,
    opcoes: ['Trocador de calor a gás', 'Bomba de calor elétrica', 'Sem aquecimento'],
  });

  perguntas.push({
    campo: 'atrativos',
    texto: `Atrativos? (cascata, hidro, prainha…)`,
    opcoes: ['Cascata (lâmina d\'água)', 'Cascata + hidromassagem', 'Prainha de entrada', 'Nenhum atrativo'],
  });

  perguntas.push({
    campo: 'padrao',
    texto: `Última: padrão dos equipamentos?`,
    opcoes: ['Econômico', 'Padrão ⭐', 'Premium'],
  });

  return perguntas;
}

/**
 * REAL — perguntas derivadas do que o BACKEND devolveu (NADA de cadastro):
 *  - divergência entre IAs (consenso) → pergunta o valor correto;
 *  - área não evidenciada / profundidade sem corte (validação) → pergunta;
 *  - aquecimento/atrativos/padrão → personalização do orçamento.
 * Mensagens curtas (intro em bolhas separadas) — tom de conversa.
 */
function buildPerguntasReais(analise: ProjectAnalysisV2): Pergunta[] {
  const perguntas: Pergunta[] = [];
  const docs = analise.analises ?? [];

  // Divergências do consenso → o humano decide (vira evidência CONFIRMACAO_HUMANA).
  // Os valores que cada IA leu viram OPÇÕES clicáveis.
  const NOME_IA: Record<string, string> = { openai: 'GPT-4o', anthropic: 'Claude', gemini: 'Gemini' };
  const vistos = new Set<string>();
  for (const doc of docs) {
    const cons = doc.extracao?.__consenso;
    if (!cons) continue;
    for (const c of cons.campos ?? []) {
      if (c.status !== 'DIVERGENTE' || vistos.has(c.campo)) continue;
      vistos.add(c.campo);
      const [alvoBruto, campoBruto] = c.campo.split('.');
      const alvo = alvoBruto.replace(/_/g, ' ');
      const campo = (campoBruto ?? 'areaM2') as CampoResolvivel;
      const unidade = campo === 'areaM2' ? 'm²' : 'm';
      const votos = (c.votos ?? []).filter((v) => v.valor != null);
      perguntas.push({
        campo: `resolver:${alvo}:${campo}`,
        resolve: { alvo, campo },
        intro: [
          `⚠️ As IAs divergiram na ${campo === 'areaM2' ? 'área' : campo} da ${alvo.toLowerCase()}:`,
          votos.map((v) => `${NOME_IA[v.provider] ?? v.provider} leu ${String(v.valor).replace('.', ',')} ${unidade}`).join(' · '),
        ],
        texto: `Confere na planta — qual é o correto?`,
        ...(votos.length ? { opcoes: votos.map((v) => `${String(v.valor).replace('.', ',')} ${unidade} (${NOME_IA[v.provider] ?? v.provider})`) } : {}),
      });
    }
  }

  // Leituras de uma única IA (sem corroboração) → vira SUGESTÃO clicável na pergunta.
  // Nomes podem variar entre consenso e consolidação ("PRAINHA" vs "PRAINHA / PISCINA
  // ORGÂNICA") → matching tolerante por inclusão.
  const leiturasUnicasArea: { alvo: string; valor: number }[] = [];
  for (const doc of docs) {
    for (const c of doc.extracao?.__consenso?.campos ?? []) {
      if (c.status !== 'LIDO_POR_UMA' || !c.campo.endsWith('.areaM2')) continue;
      const v = c.votos?.find((x) => x.valor != null)?.valor ?? c.valor;
      if (v != null) leiturasUnicasArea.push({ alvo: c.campo.replace('.areaM2', '').replace(/_/g, ' ').toUpperCase(), valor: v });
    }
  }
  const sugestaoArea = (alvo: string): number | undefined => {
    const a = alvo.toUpperCase();
    return leiturasUnicasArea.find((l) => a.includes(l.alvo) || l.alvo.includes(a))?.valor;
  };

  // Pendências da validação — cada uma vira pergunta resolvível (nunca beco sem saída)
  for (const p of analise.validacao?.pendencias ?? []) {
    if (p.codigo === 'PROFUNDIDADE_SEM_CORTE') {
      perguntas.push({
        campo: `resolver:${p.alvo}:profundidadeMaxM`,
        resolve: { alvo: p.alvo, campo: 'profundidadeMaxM' },
        intro: [`A profundidade da ${p.alvo.toLowerCase()} não está na planta (faltou a prancha de cortes).`],
        texto: `Qual é?`,
        opcoes: ['1,20 m (recreação)', '1,40 m (padrão residencial)', '1,50 m', '1,20 a 1,60 m (fundo inclinado)'],
      });
    } else if (p.codigo === 'PISCINA_SEM_AREA') {
      const sugestao = sugestaoArea(p.alvo);
      perguntas.push({
        campo: `resolver:${p.alvo}:areaM2`,
        resolve: { alvo: p.alvo, campo: 'areaM2' },
        intro: [
          `A área da ${p.alvo.toLowerCase()} não ficou clara na leitura.` +
          (sugestao != null ? ` Uma IA leu ${String(sugestao).replace('.', ',')} m², sem confirmação das outras.` : ''),
        ],
        texto: `Confere na planta — qual é a área, em m²?`,
        ...(sugestao != null ? { opcoes: [`${String(sugestao).replace('.', ',')} m² (leitura da IA)`] } : {}),
      });
    }
  }

  // Conflitos entre documentos (consolidação) → o humano decide o valor
  for (const cf of analise.consolidacao?.conflitos ?? []) {
    const campo = cf.campo as CampoResolvivel;
    perguntas.push({
      campo: `resolver:${cf.alvo}:${campo}`,
      resolve: { alvo: cf.alvo, campo },
      intro: [`Os documentos conflitam sobre ${campo} da ${cf.alvo.toLowerCase()}.`],
      texto: `Qual é o valor correto?`,
    });
  }

  perguntas.push({
    campo: 'aquecimento',
    texto: `Aquecimento — como prefere?`,
    opcoes: ['Trocador de calor a gás', 'Bomba de calor elétrica', 'Sem aquecimento'],
  });
  perguntas.push({
    campo: 'atrativos',
    texto: `Atrativos? (cascata, hidro, prainha…)`,
    opcoes: ['Cascata (lâmina d\'água)', 'Cascata + hidromassagem', 'Prainha de entrada', 'Nenhum atrativo'],
  });
  perguntas.push({
    campo: 'padrao',
    texto: `Última: padrão dos equipamentos?`,
    opcoes: ['Econômico', 'Padrão ⭐', 'Premium'],
  });

  // Abertura mínima: 1 bolha — nada que não seja insumo do orçamento.
  const introGeral = [
    `Leitura concluída! ✅ Vou confirmar só o que falta pro orçamento:`,
  ];
  perguntas[0].intro = [...introGeral, ...(perguntas[0].intro ?? [])];

  return perguntas;
}

/** Extrai números (m / m²) de uma resposta: "1,50 m" → [1.5]; "1,20 a 1,60" → [1.2, 1.6]. */
function parseNumeros(s: string): number[] {
  return [...s.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => parseFloat(m[1].replace(',', '.')));
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
type Origem = 'evidencia' | 'voce' | 'norma' | 'calculo' | 'pendente';
const ORIGEM_META: Record<Origem, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  evidencia: { label: 'Evidenciado na planta', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  voce:      { label: 'Você confirmou',        cls: 'bg-blue-100 text-blue-700',       Icon: UserCheck },
  norma:     { label: 'Por norma (NBR)',       cls: 'bg-violet-100 text-violet-700',   Icon: ShieldCheck },
  calculo:   { label: 'Calculado',             cls: 'bg-amber-100 text-amber-700',     Icon: Calculator },
  pendente:  { label: 'Não evidenciado',       cls: 'bg-stone-200 text-stone-600',     Icon: AlertTriangle },
};

function LinhaMedida({ Icon, rotulo, valor, origem, detalhe }: {
  Icon: React.ComponentType<{ className?: string }>; rotulo: string; valor: string; origem: Origem; detalhe?: string;
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
        {detalhe && <p className="truncate text-[11px] text-muted-foreground">{detalhe}</p>}
      </div>
      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', o.cls)}>
        <o.Icon className="h-3 w-3" /> {o.label}
      </span>
    </div>
  );
}

/** Origem de um campo consolidado real: evidência da planta ou decisão humana. */
function origemDoCampo(campo: CampoEvid | undefined): { origem: Origem; detalhe?: string } {
  if (!campo || campo.valor === null) return { origem: 'pendente' };
  const ultima = campo.fontes[campo.fontes.length - 1];
  if (ultima?.documento === 'CONFIRMACAO_HUMANA') return { origem: 'voce' };
  return { origem: 'evidencia', detalhe: ultima ? `${ultima.fonte} — ${ultima.documento}${ultima.pagina ? ` (pág. ${ultima.pagina})` : ''}` : undefined };
}

function fmtM(v: number | null | undefined, unidade: string): string {
  if (v === null || v === undefined) return '—';
  return `${String(v).replace('.', ',')} ${unidade}`;
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
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Lock SÍNCRONO contra reentrância: impede 2 sendMsg concorrentes (clique duplo
  // ou opção que renderizou cedo) — que pulariam uma pergunta e travariam o confirmar.
  const enviandoRef = useRef(false);

  // modo REAL
  const [obraId, setObraId] = useState<string | null>(null);
  const [analise, setAnalise] = useState<ProjectAnalysisV2 | null>(null);
  const [faseMsg, setFaseMsg] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendenciasErro, setPendenciasErro] = useState<string[]>([]);
  const [confirmado, setConfirmado] = useState(false);

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

  /**
   * Exibe uma pergunta como CONVERSA: bolhas curtas, uma por vez, com "digitando…".
   * chatLoading fica LIGADO o tempo todo da digitação → as opções/input só aparecem
   * quando a pergunta termina (sem piscar antes), e o guard de sendMsg bloqueia
   * cliques durante a animação.
   */
  async function mostrarPergunta(p: Pergunta) {
    setChatLoading(true);
    for (const m of [...(p.intro ?? []), p.texto]) {
      await pause(620);
      setMsgs((prev) => [...prev, { papel: 'assistant', texto: m }]);
      await pause(260);
    }
    setChatLoading(false);
  }

  // ─── Pipeline DEMO (simulação local — usada na demo de vendas) ───────────────

  async function iniciarAnaliseDemo() {
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
    const qs = buildPerguntasDemo(atualizados);
    setPerguntas(qs);
    setRespostas({});
    setPerguntaIdx(0);
    setMsgs([]);
    setStep('perguntas');
    await mostrarPergunta(qs[0]);
  }

  // ─── Pipeline REAL (upload → consenso 3-IA → perguntas reais) ────────────────

  async function iniciarAnaliseReal() {
    setErro(null);
    setPendenciasErro([]);
    const iniciais: DocAnalise[] = files.map((f) => ({ nome: f.name, tipo: null, fase: 'fila', dados: 0 }));
    setDocs(iniciais);
    setStep('analise');

    try {
      // 1. Obra-recipiente (cliente "Orçamentos Rápidos" + obra com data)
      setFaseMsg('Preparando a obra…');
      diagLog('análise real: iniciando', { arquivos: files.map((f) => ({ nome: f.name, bytes: f.size })) });
      const cliente = await analiseApi.garantirClienteRapido();
      const nomeObra = `Novo Orçamento ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} — ${files[0].name.slice(0, 40)}`;
      const obra = await analiseApi.criarObraRapida(cliente.id, nomeObra);
      setObraId(obra.id);
      diagLog('obra criada', { obraId: obra.id, nome: nomeObra });

      // 2. Upload de cada arquivo (≤4MB via função; >4MB direto ao storage)
      const atualizados = [...iniciais];
      for (let i = 0; i < files.length; i++) {
        atualizados[i] = { ...atualizados[i], fase: 'classificando' };
        setDocs([...atualizados]);
        setFaseMsg(`Enviando ${files[i].name}…`);
        const arq = await leituraApi.upload(obra.id, files[i]);
        diagLog('upload ok', { arquivoId: arq.id, nome: arq.nomeOriginal });
        atualizados[i] = { ...atualizados[i], fase: 'extraindo' };
        setDocs([...atualizados]);
      }

      // 3. Análise síncrona com consenso 3-IA (a parte demorada)
      setFaseMsg(`As 3 IAs (GPT-4o + Claude + Gemini) estão lendo ${files.length === 1 ? 'o documento' : 'os documentos'} de forma independente — ~1 a 3 min por documento. Não feche a página.`);
      const t0 = performance.now();
      const resultado = await analiseApi.disparar(obra.id);
      diagLog('análise concluída', { analiseId: resultado.id, status: resultado.status, segundos: Math.round((performance.now() - t0) / 1000) });
      setAnalise(resultado);

      // 4. Docs reais (disciplina + modelo que leu)
      setDocs(resultado.analises.map((a) => ({
        nome: a.arquivo.nomeOriginal,
        tipo: (a.documentType in TIPO_META ? a.documentType : null) as TipoDoc | null,
        fase: a.status === 'EXTRAIDO' ? 'ok' : 'falha',
        dados: Object.keys(a.extracao ?? {}).filter((k) => k !== '__consenso').length,
        modeloIa: a.modeloIa,
      })));

      // 5. Perguntas vindas das pendências/divergências REAIS
      const qs = buildPerguntasReais(resultado);
      setPerguntas(qs);
      setRespostas({});
      setPerguntaIdx(0);
      setMsgs([]);
      setStep('perguntas');
      await mostrarPergunta(qs[0]);
    } catch (e) {
      const msg = diagErro('análise real', e);
      setErro(`A análise falhou: ${msg}`);
      setStep('upload');
    }
  }

  /** Aplica as respostas no backend: resolver pendências + dados da obra. */
  async function aplicarRespostasReais(todas: Record<string, string>) {
    if (!analise || !obraId) return;
    setChatLoading(true);
    try {
      // pendências/divergências → evidência CONFIRMACAO_HUMANA
      for (const q of perguntas) {
        if (!q.resolve) continue;
        const resposta = todas[q.campo];
        if (!resposta) continue;
        const nums = parseNumeros(resposta);
        if (nums.length === 0) continue;
        if (q.resolve.campo === 'profundidadeMaxM') {
          const min = nums.length > 1 ? Math.min(...nums) : nums[0];
          const max = Math.max(...nums);
          await analiseApi.resolver(analise.id, { alvo: q.resolve.alvo, campo: 'profundidadeMinM', valor: min, justificativa: resposta });
          await analiseApi.resolver(analise.id, { alvo: q.resolve.alvo, campo: 'profundidadeMaxM', valor: max, justificativa: resposta });
          diagLog('pendência resolvida', { alvo: q.resolve.alvo, campo: 'profundidade', min, max });
        } else {
          await analiseApi.resolver(analise.id, { alvo: q.resolve.alvo, campo: q.resolve.campo, valor: nums[0], justificativa: resposta });
          diagLog('divergência resolvida', { alvo: q.resolve.alvo, campo: q.resolve.campo, valor: nums[0] });
        }
      }

      // preferências do orçamento → obra (sem dados cadastrais — só o que gera orçamento)
      await analiseApi.atualizarObra(obraId, {
        observacoes: `Preferências do orçamento (Novo Orçamento com IA): aquecimento=${todas['aquecimento'] ?? '-'} · atrativos=${todas['atrativos'] ?? '-'} · padrão=${todas['padrao'] ?? '-'}`,
      });
      diagLog('obra atualizada (preferências)');

      // estado final pós-resoluções
      const atualizada = await analiseApi.obter(obraId);
      if (atualizada) setAnalise(atualizada);
      diagLog('análise revalidada', { status: atualizada?.status, pendencias: atualizada?.validacao?.pendencias?.length ?? 0 });
      setStep('confirmar');
    } catch (e) {
      const msg = diagErro('aplicar respostas', e);
      setErro(`Não consegui registrar as respostas: ${msg}`);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMsg(resposta?: string) {
    const texto = (resposta ?? input).trim();
    // Lock síncrono: enquanto uma pergunta digita ou as respostas são aplicadas,
    // qualquer novo envio é ignorado (evita pular pergunta → confirmar falhar).
    if (!texto || enviandoRef.current || chatLoading) return;
    enviandoRef.current = true;
    try {
      setInput('');
      setMsgs((m) => [...m, { papel: 'user', texto }]);
      const campo = perguntas[perguntaIdx]?.campo;
      const todas = campo ? { ...respostas, [campo]: texto } : respostas;
      if (campo) setRespostas(todas);

      const next = perguntaIdx + 1;
      if (next < perguntas.length) {
        setPerguntaIdx(next);
        await mostrarPergunta(perguntas[next]);
      } else if (isDemo()) {
        setChatLoading(true);
        await pause(500);
        setChatLoading(false);
        setStep('confirmar');
      } else {
        setMsgs((m) => [...m, { papel: 'assistant', texto: 'Registrando…' }]);
        await aplicarRespostasReais(todas);
      }
    } finally {
      enviandoRef.current = false;
    }
  }

  async function gerarOrcamento() {
    if (isDemo()) {
      setGerando(true);
      await pause(1600);
      navigate('/orcamentos/orc1042', { state: { geradoAgora: true } });
      return;
    }
    if (!analise) return;
    setGerando(true);
    setErro(null);
    setPendenciasErro([]);
    try {
      const confirmada = await analiseApi.confirmar(analise.id);
      diagLog('análise CONFIRMADA', { analiseId: confirmada.id, status: confirmada.status });
      setAnalise(confirmada);
      setConfirmado(true);
    } catch (e) {
      const body = (e as { body?: { motivo?: string; pendencias?: string[] } }).body;
      diagErro('confirmar análise', e);
      setErro(body?.motivo ?? 'Não foi possível confirmar — existem pendências.');
      setPendenciasErro(body?.pendencias ?? []);
    } finally {
      setGerando(false);
    }
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

  // dados derivados p/ a tela de confirmação DEMO
  const temCortes = docs.some((d) => d.tipo === 'CORTES' || d.tipo === 'DETALHES_EXECUTIVOS');
  const profStr = temCortes ? '1,50 m' : (respostas['profundidade'] ?? '—');
  const profNums = parseNumeros(profStr);
  const volume = (41.4 * (profNums[0] ?? 1.4)).toFixed(1).replace('.', ',');

  // avisos de leitura única (consenso) p/ a tela real
  const avisosLeituraUnica = (analise?.analises ?? [])
    .flatMap((a) => a.extracao?.__consenso?.campos ?? [])
    .filter((c) => c.status === 'LIDO_POR_UMA');

  // Pendências que AINDA bloqueiam o orçamento após as respostas. Se sobrar algo
  // aqui, o "confirmar" vai falhar — então mostramos antes, com orientação, em vez
  // de deixar o cliente clicar e tomar erro (foi o que travou o teste do cliente).
  const pendentesRestantes = (analise?.validacao?.pendencias ?? []).concat(analise?.validacao?.erros ?? []);

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

      {/* Erro global (modo real) — visível e copiável */}
      {erro && (
        <div className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
          </p>
          {pendenciasErro.map((p, i) => (
            <p key={i} className="pl-6 text-xs text-muted-foreground">· {p}</p>
          ))}
          <p className="pl-6 text-[11px] text-muted-foreground">
            Detalhes técnicos no console do navegador (F12) — eventos em <code>window.__stilloDiag</code>.
          </p>
        </div>
      )}

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
                <Button className="w-full" size="lg" onClick={() => (isDemo() ? iniciarAnaliseDemo() : iniciarAnaliseReal())}>
                  <Sparkles className="h-4 w-4" /> Analisar com IA <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                {!isDemo() && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Leitura real com consenso entre 3 IAs (GPT-4o + Claude + Gemini) — ~1 a 3 min por documento.
                  </p>
                )}
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
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', tipoMeta(d.tipo).cor)}>
                        {tipoMeta(d.tipo).label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.fase === 'fila' && 'Aguardando…'}
                    {d.fase === 'classificando' && (isDemo() ? 'Classificando disciplina (nome + carimbo + conteúdo)…' : 'Enviando arquivo…')}
                    {d.fase === 'extraindo' && (isDemo() ? `Extraindo dados de ${tipoMeta(d.tipo).label} — somente desta disciplina…` : 'Na fila de leitura das IAs…')}
                    {d.fase === 'ok' && `✓ ${d.dados} dados extraídos com evidência (fonte + página)`}
                    {d.fase === 'falha' && '✗ falha na leitura — veja o erro acima'}
                  </p>
                </div>
                {(d.fase === 'classificando' || d.fase === 'extraindo')
                  ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  : d.fase === 'ok'
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : d.fase === 'falha'
                  ? <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  : <div className="h-4 w-4 rounded-full border-2 border-muted" />
                }
              </div>
            ))}
            {!isDemo() && faseMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> {faseMsg}
              </div>
            )}
            {isDemo() && docs.every((d) => d.fase === 'ok') && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                <Layers className="h-4 w-4 shrink-0" /> Consolidando — e separando o que precisa confirmar com você…
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {isDemo()
                ? 'Motor v2 · GPT-4o Vision lê as pranchas como imagem · zero inferência'
                : 'Motor v2 · consenso GPT-4o + Claude + Gemini · divergência vira pergunta, nunca chute'}
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
                  placeholder={atual?.resolve ? 'Digite o valor — ex: 48,8' : 'Digite sua resposta…'}
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
            <h2 className="text-lg font-semibold">
              {confirmado ? 'Medidas confirmadas!' : 'Confirme as medidas do projeto'}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {confirmado
                ? 'A análise foi confirmada e a obra está liberada para dimensionamento e orçamento.'
                : 'Revise tudo abaixo. Cada dado mostra de onde veio. Nada foi estimado às cegas.'}
            </p>
          </div>

          <CardContent className="space-y-5 pt-5">
            {isDemo() ? (
              <>
                {/* Geometria (DEMO) */}
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
              </>
            ) : (
              <>
                {/* Geometria REAL — cada corpo d'água consolidado, com origem por evidência */}
                {(analise?.consolidacao?.corposDagua ?? []).map((corpo: CorpoDagua) => {
                  const oArea = origemDoCampo(corpo.areaM2);
                  const oProfMax = origemDoCampo(corpo.profundidadeMaxM);
                  const profMin = corpo.profundidadeMinM?.valor;
                  const profMax = corpo.profundidadeMaxM?.valor;
                  const profTxt = profMax == null ? '—'
                    : profMin != null && profMin !== profMax
                    ? `${fmtM(profMin, '')}a ${fmtM(profMax, 'm')}`
                    : fmtM(profMax, 'm');
                  return (
                    <div key={corpo.nome}>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Waves className="h-3.5 w-3.5" /> {corpo.nome}
                      </p>
                      <div className="divide-y rounded-xl border px-3">
                        <LinhaMedida Icon={Ruler} rotulo="Área" valor={fmtM(corpo.areaM2?.valor, 'm²')} origem={oArea.origem} detalhe={oArea.detalhe} />
                        <LinhaMedida Icon={ArrowRight} rotulo="Profundidade" valor={profTxt} origem={oProfMax.origem} detalhe={oProfMax.detalhe} />
                        {corpo.volumeM3?.valor != null && (
                          <LinhaMedida Icon={Calculator} rotulo="Volume" valor={fmtM(corpo.volumeM3.valor, 'm³')} origem={origemDoCampo(corpo.volumeM3).origem} />
                        )}
                      </div>
                    </div>
                  );
                })}

                {avisosLeituraUnica.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <p className="font-medium">Leituras com uma única IA (sem corroboração):</p>
                    {avisosLeituraUnica.map((c) => (
                      <p key={c.campo}>· {c.campo.replace(/_/g, ' ').replace('.areaM2', ' — área')} {c.valor != null ? `(${String(c.valor).replace('.', ',')})` : ''}</p>
                    ))}
                    <p className="mt-1">Esses valores NÃO entram no orçamento sem confirmação — revise na planta se forem relevantes.</p>
                  </div>
                )}
              </>
            )}

            {/* Sistemas */}
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Sistemas
              </p>
              <div className="divide-y rounded-xl border px-3">
                <LinhaMedida Icon={Filter}    rotulo="Filtragem"   valor="Bomba + filtro + skimmers"        origem="norma" />
                <LinhaMedida Icon={Lightbulb} rotulo="Iluminação"  valor="LED subaquático"                  origem="norma" />
                <LinhaMedida Icon={Flame}     rotulo="Aquecimento" valor={respostas['aquecimento'] ?? '—'}  origem="voce" />
                <LinhaMedida Icon={Waves}     rotulo="Atrativos"   valor={respostas['atrativos'] ?? '—'}    origem="voce" />
                <LinhaMedida Icon={Award}     rotulo="Padrão dos equipamentos" valor={respostas['padrao'] ?? '—'} origem="voce" />
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> evidência (planta)</span>
              <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-blue-600" /> você confirmou</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-violet-600" /> por norma</span>
              <span className="flex items-center gap-1"><Calculator className="h-3 w-3 text-amber-600" /> calculado</span>
            </div>

            {/* Pendências que ainda bloqueiam (modo real) — mostradas ANTES de clicar */}
            {!isDemo() && !confirmado && pendentesRestantes.length > 0 && (
              <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold">Ainda falta resolver pra liberar o orçamento:</p>
                {pendentesRestantes.map((p, i) => (
                  <p key={i} className="pl-1">· {p.mensagem}</p>
                ))}
                <p className="pt-1 text-[11px]">
                  Itens de medida: use "← revisar respostas". Itens que pedem outra prancha
                  (cortes, hidráulica): anexe o arquivo e gere uma nova análise.
                </p>
              </div>
            )}

            {confirmado ? (
              <Button className="w-full" size="lg" onClick={() => navigate(`/obras/${obraId}/dimensionamento`)}>
                <CheckCircle2 className="h-4 w-4" /> Ir para o Dimensionamento <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={gerarOrcamento} disabled={gerando || (!isDemo() && pendentesRestantes.length > 0)}>
                {gerando ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {isDemo() ? 'Gerando orçamento técnico…' : 'Confirmando medidas…'}</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> {isDemo() ? 'Confirmar e gerar orçamento' : 'Confirmar medidas e liberar orçamento'} <ArrowRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            )}
            {!confirmado && (
              <button
                onClick={async () => { setStep('perguntas'); setRespostas({}); setPerguntaIdx(0); setMsgs([]); await mostrarPergunta(perguntas[0]); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                ← revisar respostas
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
