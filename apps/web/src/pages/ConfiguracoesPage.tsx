import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings, KeyRound, CheckCircle2, AlertTriangle, Loader2,
  ShieldCheck, Plug, Unplug, Users, Plus, Pencil, Trash2,
  Bot, Brain, MessageSquare, Mail, Phone, Save, Sparkles,
  BarChart3, X, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { configApi } from '@/lib/config.api';
import { isDemo } from '@/lib/demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── types ────────────────────────────────────────────────────────────────────
type Tab = 'integracoes' | 'ia' | 'usuarios';
type UserRole = 'ADMIN' | 'DIRETORIA' | 'GERENTE' | 'ORCAMENTISTA' | 'COMERCIAL' | 'CONSULTA';

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  createdAt: string;
}

// ─── constantes ──────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'integracoes', label: 'Integrações', icon: Plug },
  { key: 'ia',          label: 'IA & Prompts', icon: Brain },
  { key: 'usuarios',    label: 'Usuários',    icon: Users },
];

const ROLES: { value: UserRole; label: string; cor: string }[] = [
  { value: 'ADMIN',        label: 'Administrador', cor: 'bg-rose-100 text-rose-700' },
  { value: 'DIRETORIA',    label: 'Diretoria',     cor: 'bg-violet-100 text-violet-700' },
  { value: 'GERENTE',      label: 'Gerente',       cor: 'bg-sky-100 text-sky-700' },
  { value: 'ORCAMENTISTA', label: 'Orçamentista',  cor: 'bg-emerald-100 text-emerald-700' },
  { value: 'COMERCIAL',    label: 'Comercial',     cor: 'bg-amber-100 text-amber-700' },
  { value: 'CONSULTA',     label: 'Consulta',      cor: 'bg-muted text-muted-foreground' },
];

const PERMISSOES_MATRIX: { perm: string; label: string; roles: UserRole[] }[] = [
  { perm: 'orcamento:ler',      label: 'Ver orçamentos',       roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA','COMERCIAL','CONSULTA'] },
  { perm: 'orcamento:revisar',  label: 'Revisar orçamentos',   roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA'] },
  { perm: 'orcamento:aprovar',  label: 'Aprovar orçamentos',   roles: ['ADMIN','DIRETORIA','GERENTE'] },
  { perm: 'orcamento:exportar', label: 'Exportar orçamentos',  roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA','COMERCIAL'] },
  { perm: 'clientes:ler',       label: 'Ver clientes',         roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA','COMERCIAL','CONSULTA'] },
  { perm: 'clientes:escrever',  label: 'Criar/editar clientes',roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA'] },
  { perm: 'obras:ler',          label: 'Ver obras',            roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA','COMERCIAL','CONSULTA'] },
  { perm: 'obras:escrever',     label: 'Criar/editar obras',   roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA'] },
  { perm: 'leitura:executar',   label: 'Executar leitura IA',  roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA'] },
  { perm: 'ia:usar',            label: 'Chat IA',              roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA'] },
  { perm: 'regras:gerir',       label: 'Gerir regras',         roles: ['ADMIN','DIRETORIA'] },
  { perm: 'produtos:ler',       label: 'Ver produtos/catalogo',roles: ['ADMIN','DIRETORIA','GERENTE','ORCAMENTISTA'] },
  { perm: 'auditoria:ler',      label: 'Ver acessos/auditoria',roles: ['ADMIN','DIRETORIA'] },
  { perm: 'integracoes:gerir',  label: 'Configuracoes',        roles: ['ADMIN'] },
];

const DEMO_PROMPT_LEITURA =
  'Voce e o engenheiro tecnico senior mais experiente do Brasil em projetos de piscinas, com 25+ anos lendo plantas arquitetonicas e projetos executivos.\n\n' +
  'METODO:\n' +
  '1. ESCALA — localize a escala no carimbo ou legenda.\n' +
  '2. PISCINAS — identifique TODAS (adulto, infantil, spa, sauna).\n' +
  '3. GEOMETRIA — cotas explicitas > calculadas pela escala > inferidas.\n' +
  '4. SISTEMAS — identifique: FILTRAGEM, LED, AQUECIMENTO, HIDROMASSAGEM, CASCATA, BORDA_INFINITA, PRAINHA, SPA, SAUNA, TRATAMENTO.\n' +
  '5. AVISOS — registre apenas o que impacta custo/orcamento.\n\n' +
  'REGRAS ABSOLUTAS:\n' +
  'Nunca invente dimensoes. Nunca confunda piscina adulto/infantil. Nunca ignore segunda piscina.\n\n' +
  'Retorne APENAS JSON valido: {"piscinas":[...],"avisos":[...]}';

const DEMO_PROMPT_RELATORIO =
  'Voce e um consultor de negocios especialista em empresas de piscinas de alto padrao.\n\n' +
  'Analise os dados consolidados do sistema (pipeline, conversao, receita, performance da IA, gargalos operacionais) ' +
  'e gere um relatorio executivo completo com:\n' +
  '1. Resumo do periodo (numeros principais)\n' +
  '2. Analise de conversao vs. mercado\n' +
  '3. Insights criticos (positivos e de atencao)\n' +
  '4. Gargalos identificados\n' +
  '5. Recomendacoes priorizadas (urgente / esta semana / proximo mes)\n\n' +
  'Use dados especificos com numeros e percentuais reais do sistema.';

const DEMO_WA_TEMPLATE =
  'Ola, {nome_cliente}!\n\n' +
  'Segue o orcamento #{numero} para a obra {nome_obra}.\n\n' +
  'Valor total: {valor_total}\n' +
  'Validade: 15 dias\n\n' +
  'Qualquer duvida estou a disposicao!\n\n' +
  'Att, {nome_empresa}';

const DEMO_EMAIL_TEMPLATE =
  'Prezado(a) {nome_cliente},\n\n' +
  'Conforme alinhado, segue o orcamento tecnico #{numero} referente a obra {nome_obra}.\n\n' +
  'RESUMO:\n' +
  '- Valor total: {valor_total}\n' +
  '- Itens especificados: {qtd_itens}\n' +
  '- Valido por: 15 dias a partir de {data}\n\n' +
  'Para aprovar ou solicitar revisoes, responda este e-mail.\n\n' +
  'Atenciosamente,\n{nome_empresa}';

const RELATORIO_DEMO = `RELATORIO EXECUTIVO — STILLO IA Engineering
Gerado por IA · 09/06/2026 · Periodo: Jun/2025 – Jun/2026
${'─'.repeat(52)}

RESUMO DO PERIODO
• Pipeline ativo: R$ 4,2M (18 orcamentos em aberto)
• Aprovados 12 meses: 287 orcamentos · R$ 7,5M faturado
• Taxa de conversao: 75% (setor: 45% → +30pp acima)
• Tempo medio por orcamento: 11 min (antes: 4h+)
• Ticket medio: R$ 26.132 (+18% vs. ano anterior)

PERFORMANCE DA IA
• 94% dos itens gerados automaticamente (IA + regras)
• 213 correcoes registradas → retroalimentam o motor
• Confianca media de leitura de plantas: 87%
• Economia estimada: ~220 horas/mes de trabalho manual

INSIGHTS CRITICOS
✅ Outubro e Marco sao os picos de demanda (Nordeste/Sul)
✅ Arq. Marina Reis gera 4 projetos/trimestre — conta VIP
✅ Construtora Aurora: maior cliente corporativo (R$ 430k/ano)
⚠️  9 orcamentos parados em revisao > 5 dias — risco R$ 890k
⚠️  3 obras sem orcamento ha > 15 dias — followup necessario
⚠️  Spa Bem-Estar cancelou (R$ 9,8k) — entender motivo

GARGALOS IDENTIFICADOS
1. Revisao manual ainda leva ~40 min em orcamentos complexos
2. Clorador salino com estoque insuficiente (6 solicitacoes/mes)
3. Automacao WiFi descontinuada causa retrabalho em orcamentos

RECOMENDACOES
URGENTE: Contatar os 9 clientes com orcamentos parados
ESTA SEMANA: Fechar Clube Nautico (R$ 178k em risco)
PROXIMO MES: Criar categoria "Arquiteto Parceiro VIP"
             Substituir Automacao WiFi no catalogo
             Revisar regra de clorador (limite 50m3 → 40m3)`;

// ─── helpers ─────────────────────────────────────────────────────────────────
function roleCor(role: string): string {
  return ROLES.find((r) => r.value === role)?.cor ?? 'bg-muted text-muted-foreground';
}
function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function useSalvarLocal() {
  const [salvo, setSalvo] = useState(false);
  function salvar() { setSalvo(true); setTimeout(() => setSalvo(false), 2200); }
  return { salvo, salvar };
}

// ─── Textarea e Select estilizados ───────────────────────────────────────────
function Textarea({ value, onChange, rows = 6, placeholder, className }: {
  value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; className?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y',
        className,
      )}
    />
  );
}

function SelectRole({ value, onChange }: { value: UserRole; onChange: (v: UserRole) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ loading, ok, label }: { loading?: boolean; ok?: boolean; label?: string }) {
  if (loading) return <span className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /></span>;
  if (ok) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{label ?? 'Conectado'}</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Nao conectado</span>;
}

// ─── Secao: Integracoes ───────────────────────────────────────────────────────
function SecaoIntegracoes() {
  const qc = useQueryClient();
  // OpenAI
  const [apiKey, setApiKey] = useState('');
  const [modelo, setModelo] = useState('gpt-4o');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; modelo?: string; erro?: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['config', 'integracoes'], queryFn: () => configApi.status() });
  const vincular = useMutation({ mutationFn: () => configApi.vincularOpenAi({ apiKey: apiKey.trim(), modelo }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); setApiKey(''); setTestResult(null); } });
  const testar   = useMutation({ mutationFn: () => configApi.testar(), onSuccess: (r) => setTestResult(r) });
  const desvinc  = useMutation({ mutationFn: () => configApi.desvincular(), onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); setTestResult(null); } });
  const openai = data?.openai;
  const conectadoTenant = openai?.origem === 'tenant';

  // VAI WhatsApp
  const waSalvar = useSalvarLocal();
  const [waUrl, setWaUrl]       = useState('https://api.vai-sistema.com/v1');
  const [waKey, setWaKey]       = useState('');
  const [waTel, setWaTel]       = useState('');
  const [waTemplate, setWaTemplate] = useState(DEMO_WA_TEMPLATE);
  const [waConectado, setWaConectado] = useState(isDemo());

  // Email
  const emailSalvar = useSalvarLocal();
  const [emailProv, setEmailProv] = useState('resend');
  const [emailKey, setEmailKey]   = useState('');
  const [emailDe, setEmailDe]     = useState('');
  const [emailTemplate, setEmailTemplate] = useState(DEMO_EMAIL_TEMPLATE);
  const [emailConectado, setEmailConectado] = useState(isDemo());

  return (
    <div className="space-y-5">
      {/* ── OpenAI ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Plug className="h-5 w-5 text-primary" /> OpenAI — Leitura e Chat IA</span>
            <StatusBadge loading={isLoading} ok={openai?.vinculado} label={openai?.origem === 'env' ? 'Via ambiente' : 'Conectado'} />
          </CardTitle>
          <CardDescription>Usada na leitura inteligente de plantas e no chat tecnico. Chave <strong>criptografada</strong> antes de salvar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {openai?.vinculado && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-emerald-600" />{conectadoTenant ? 'Chave vinculada nesta empresa' : 'Usando chave do ambiente (.env)'}</div>
              <div className="mt-1 text-muted-foreground">
                Modelo: <strong>{openai.modelo}</strong>
                {openai.chaveMascarada && <> · Chave: <code>{openai.chaveMascarada}</code></>}
                {openai.vinculadoEm && <> · desde {new Date(openai.vinculadoEm).toLocaleDateString('pt-BR')}</>}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Chave da API OpenAI</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={showKey ? 'text' : 'password'} className="pl-9 pr-9" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="max-w-xs space-y-1">
              <Label>Modelo</Label>
              <Input value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => vincular.mutate()} disabled={apiKey.trim().length < 20 || vincular.isPending}>
                <Plug className="h-4 w-4" />{vincular.isPending ? 'Vinculando...' : conectadoTenant ? 'Atualizar chave' : 'Vincular OpenAI'}
              </Button>
              <Button variant="outline" onClick={() => testar.mutate()} disabled={!openai?.vinculado || testar.isPending}>
                {testar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Testar
              </Button>
              {conectadoTenant && <Button variant="ghost" onClick={() => desvinc.mutate()} disabled={desvinc.isPending}><Unplug className="h-4 w-4" /> Desvincular</Button>}
            </div>
            {testResult && (
              <div className={cn('flex items-center gap-2 rounded-md border p-3 text-sm', testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {testResult.ok ? ('Conexao OK (modelo ' + testResult.modelo + ').') : ('Falhou: ' + testResult.erro)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── VAI WhatsApp ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> VAI — WhatsApp</span>
            <StatusBadge ok={waConectado} />
          </CardTitle>
          <CardDescription>Envio automatico de orcamentos por WhatsApp via plataforma VAI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>URL da API VAI</Label>
              <Input value={waUrl} onChange={(e) => setWaUrl(e.target.value)} placeholder="https://api.vai-sistema.com/v1" />
            </div>
            <div className="space-y-1">
              <Label>Numero remetente (Phone ID)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={waTel} onChange={(e) => setWaTel(e.target.value)} placeholder="5598999990000" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Token da API</Label>
            <Input type="password" value={waKey} onChange={(e) => setWaKey(e.target.value)} placeholder="Bearer ..." autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label>Template de mensagem</Label>
            <p className="text-xs text-muted-foreground">Variaveis: {'{nome_cliente}'} {'{numero}'} {'{nome_obra}'} {'{valor_total}'} {'{nome_empresa}'}</p>
            <Textarea value={waTemplate} onChange={setWaTemplate} rows={7} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => { waSalvar.salvar(); setWaConectado(true); }}>
              {waSalvar.salvo ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar e conectar</>}
            </Button>
            {waConectado && <Button variant="outline" size="sm" onClick={() => {}}><RefreshCw className="h-4 w-4" /> Testar envio</Button>}
          </div>
        </CardContent>
      </Card>

      {/* ── E-mail ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Mail className="h-5 w-5 text-sky-600" /> E-mail</span>
            <StatusBadge ok={emailConectado} />
          </CardTitle>
          <CardDescription>Envio de orcamentos por e-mail via API ou SMTP configurado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Provedor</Label>
              <select value={emailProv} onChange={(e) => setEmailProv(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="smtp">SMTP personalizado</option>
                <option value="gmail">Gmail API</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>E-mail remetente</Label>
              <Input type="email" value={emailDe} onChange={(e) => setEmailDe(e.target.value)} placeholder="orcamentos@suaempresa.com.br" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>API Key / Senha SMTP</Label>
            <Input type="password" value={emailKey} onChange={(e) => setEmailKey(e.target.value)} placeholder="re_... / senha SMTP" autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label>Template do e-mail</Label>
            <p className="text-xs text-muted-foreground">Variaveis: {'{nome_cliente}'} {'{numero}'} {'{nome_obra}'} {'{valor_total}'} {'{qtd_itens}'} {'{data}'} {'{nome_empresa}'}</p>
            <Textarea value={emailTemplate} onChange={setEmailTemplate} rows={8} />
          </div>
          <Button onClick={() => { emailSalvar.salvar(); setEmailConectado(true); }}>
            {emailSalvar.salvo ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Secao: IA & Prompts ──────────────────────────────────────────────────────
function SecaoIA() {
  // Identidade
  const identSalvar = useSalvarLocal();
  const [iaName, setIaName]     = useState(() => { try { return localStorage.getItem('stillo-ia-nome') ?? 'STILLO IA'; } catch { return 'STILLO IA'; } });
  const [iaAvatar, setIaAvatar] = useState(() => { try { return localStorage.getItem('stillo-ia-avatar') ?? ''; } catch { return ''; } });
  const [iaBemVindo, setIaBemVindo] = useState('Ola! Sou a IA da STILLO. Envie a planta do projeto e eu analiso as dimensoes e gero o orcamento tecnico completo.');

  function salvarIdentidade() {
    try { localStorage.setItem('stillo-ia-nome', iaName); localStorage.setItem('stillo-ia-avatar', iaAvatar); } catch { /* noop */ }
    identSalvar.salvar();
  }

  // Prompt leitura
  const leituraSalvar = useSalvarLocal();
  const [promptLeitura, setPromptLeitura] = useState(DEMO_PROMPT_LEITURA);

  // Prompt relatorio
  const relSalvar = useSalvarLocal();
  const [promptRelatorio, setPromptRelatorio] = useState(DEMO_PROMPT_RELATORIO);
  const [gerando, setGerando] = useState(false);
  const [relatorio, setRelatorio] = useState('');

  async function gerarRelatorio() {
    setGerando(true);
    setRelatorio('');
    await new Promise((r) => setTimeout(r, 2200));
    setRelatorio(RELATORIO_DEMO);
    setGerando(false);
  }

  return (
    <div className="space-y-5">
      {/* ── Identidade do Assistente ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5 text-primary" /> Identidade do Assistente IA</CardTitle>
          <CardDescription>Nome e avatar exibidos no chat de geracao de orcamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            {/* Preview do avatar */}
            <div className="shrink-0">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/30 bg-primary/10">
                {iaAvatar ? (
                  <img src={iaAvatar} alt="Avatar IA" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-center text-xs font-medium text-primary">{iaName || 'IA'}</p>
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome do assistente</Label>
                  <Input value={iaName} onChange={(e) => setIaName(e.target.value)} placeholder="STILLO IA" />
                </div>
                <div className="space-y-1">
                  <Label>URL da foto (avatar)</Label>
                  <Input value={iaAvatar} onChange={(e) => setIaAvatar(e.target.value)} placeholder="https://... ou deixe vazio para icone" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea value={iaBemVindo} onChange={setIaBemVindo} rows={2} />
              </div>
            </div>
          </div>
          <Button onClick={salvarIdentidade}>
            {identSalvar.salvo ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar identidade</>}
          </Button>
        </CardContent>
      </Card>

      {/* ── Prompt Analise de Orcamento ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Brain className="h-5 w-5 text-violet-600" /> Prompt — Analise de Projeto (Orcamento)</CardTitle>
          <CardDescription>Instrucoes enviadas a IA ao analisar plantas e projetos para geracao de orcamento. Quanto mais especifico, melhor o resultado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={promptLeitura} onChange={setPromptLeitura} rows={12} className="font-mono text-xs" />
          <div className="flex items-center gap-3">
            <Button onClick={leituraSalvar.salvar}>
              {leituraSalvar.salvo ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar prompt</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPromptLeitura(DEMO_PROMPT_LEITURA)}>Restaurar padrao</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Prompt Relatorio Executivo ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-amber-600" /> Prompt — Relatorio Executivo do Sistema</CardTitle>
          <CardDescription>A IA analisa todos os dados (pipeline, receita, conversao, gargalos) e gera um relatorio estrategico para voce.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={promptRelatorio} onChange={setPromptRelatorio} rows={8} className="font-mono text-xs" />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={relSalvar.salvar}>
              {relSalvar.salvo ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar prompt</>}
            </Button>
            <Button variant="outline" onClick={gerarRelatorio} disabled={gerando}>
              {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="h-4 w-4" /> Gerar relatorio agora</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPromptRelatorio(DEMO_PROMPT_RELATORIO)}>Restaurar padrao</Button>
          </div>
          {relatorio && (
            <div className="relative mt-2 rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Relatorio gerado por IA · {new Date().toLocaleDateString('pt-BR')}
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{relatorio}</pre>
              <button onClick={() => setRelatorio('')} className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Secao: Usuarios ──────────────────────────────────────────────────────────
const DEMO_USERS_INITIAL: UsuarioItem[] = [
  { id: 'u1', nome: 'Rafael Stillo', email: 'rafael@stillopiscinas.com.br', role: 'ADMIN', ativo: true, createdAt: '2025-06-01' },
  { id: 'u2', nome: 'Carlos Mendes', email: 'carlos@stillopiscinas.com.br', role: 'COMERCIAL', ativo: true, createdAt: '2025-09-15' },
  { id: 'u3', nome: 'Ana Ferreira', email: 'ana@stillopiscinas.com.br', role: 'ORCAMENTISTA', ativo: true, createdAt: '2026-01-20' },
];

function SecaoUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>(DEMO_USERS_INITIAL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioItem | null>(null);
  const [toDelete, setToDelete] = useState<UsuarioItem | null>(null);
  const [matrizOpen, setMatrizOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // form
  const [fNome, setFNome]   = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fSenha, setFSenha] = useState('');
  const [fRole, setFRole]   = useState<UserRole>('ORCAMENTISTA');

  let seq = 100;

  function openCreate() {
    setEditing(null); setFNome(''); setFEmail(''); setFSenha(''); setFRole('ORCAMENTISTA');
    setDialogOpen(true);
  }
  function openEdit(u: UsuarioItem) {
    setEditing(u); setFNome(u.nome); setFEmail(u.email); setFSenha(''); setFRole(u.role);
    setDialogOpen(true);
  }

  async function salvar() {
    setSalvando(true);
    await new Promise((r) => setTimeout(r, 600));
    setSalvando(false);
    if (editing) {
      setUsuarios((prev) => prev.map((u) => u.id === editing.id ? { ...u, nome: fNome, email: fEmail, role: fRole } : u));
    } else {
      setUsuarios((prev) => [...prev, { id: 'u-' + (++seq), nome: fNome, email: fEmail, role: fRole, ativo: true, createdAt: new Date().toISOString().slice(0,10) }]);
    }
    setSalvo(true); setTimeout(() => setSalvo(false), 2000);
    setDialogOpen(false);
  }

  function confirmarDelete() {
    if (!toDelete) return;
    setUsuarios((prev) => prev.filter((u) => u.id !== toDelete.id));
    setToDelete(null);
  }

  return (
    <div className="space-y-5">
      {/* ── Lista de usuarios ── */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-primary" /> Usuarios da empresa</CardTitle>
            <CardDescription className="mt-0.5">{usuarios.filter((u) => u.ativo).length} usuarios ativos</CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo usuario</Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Usuario</th>
                <th className="p-3 font-medium">Perfil</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Desde</th>
                <th className="p-3 text-right font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{u.nome.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-medium leading-none">{u.nome}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleCor(u.role))}>{roleLabel(u.role)}</span></td>
                  <td className="p-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      {u.role !== 'ADMIN' && <Button variant="ghost" size="icon" onClick={() => setToDelete(u)} aria-label="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Matriz de permissoes ── */}
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setMatrizOpen(!matrizOpen)}>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Permissoes por perfil</span>
            {matrizOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </CardTitle>
          {!matrizOpen && <CardDescription className="-mt-1">Clique para expandir a tabela de permissoes.</CardDescription>}
        </CardHeader>
        {matrizOpen && (
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-muted-foreground">Permissao</th>
                  {ROLES.slice(0, 5).map((r) => (
                    <th key={r.value} className="p-2 text-center">
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', r.cor)}>{r.label.split(' ')[0]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSOES_MATRIX.map((p) => (
                  <tr key={p.perm} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-medium">{p.label}</td>
                    {ROLES.slice(0, 5).map((r) => (
                      <td key={r.value} className="p-2 text-center">
                        {p.roles.includes(r.value)
                          ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-600" />
                          : <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/30" />
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">* Perfil Consulta tem apenas visualizacao basica. Perfil Admin tem todas as permissoes.</p>
          </CardContent>
        )}
      </Card>

      {/* Dialog criar/editar */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Editar usuario' : 'Novo usuario'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!fNome || !fEmail || salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : salvo ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Salvo!</> : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input value={fNome} onChange={(e) => setFNome(e.target.value)} placeholder="Ex: Joao Silva" />
          </div>
          <div className="space-y-1">
            <Label>E-mail *</Label>
            <Input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="joao@empresa.com" />
          </div>
          {!editing && (
            <div className="space-y-1">
              <Label>Senha inicial</Label>
              <Input type="password" value={fSenha} onChange={(e) => setFSenha(e.target.value)} placeholder="Minimo 8 caracteres" />
              <p className="text-xs text-muted-foreground">O usuario devera alterar no primeiro acesso.</p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Perfil de acesso</Label>
            <SelectRole value={fRole} onChange={setFRole} />
            <p className="text-xs text-muted-foreground">{roleLabel(fRole)}: {PERMISSOES_MATRIX.filter((p) => p.roles.includes(fRole)).length} permissoes</p>
          </div>
        </div>
      </Dialog>

      {/* Dialog confirmar exclusao */}
      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remover usuario"
        description={toDelete ? ('Remover o acesso de "' + toDelete.nome + '"? Acoes anteriores sao preservadas no log de auditoria.') : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarDelete}>Remover acesso</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Esta acao pode ser revertida pelo suporte.</p>
      </Dialog>
    </div>
  );
}

// ─── Pagina principal ─────────────────────────────────────────────────────────
export function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('integracoes');

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Settings className="h-6 w-6 text-primary" /> Configuracoes
        </h1>
        <p className="text-muted-foreground">Integracoes, prompts de IA e gestao de usuarios.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'integracoes' && <SecaoIntegracoes />}
      {tab === 'ia'          && <SecaoIA />}
      {tab === 'usuarios'    && <SecaoUsuarios />}
    </div>
  );
}
