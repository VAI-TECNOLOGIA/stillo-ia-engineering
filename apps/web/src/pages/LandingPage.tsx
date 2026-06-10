import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Waves, ArrowRight, LogIn, Sparkles, Ruler, Package, FileText, Clock, ShieldCheck,
  Brain, CheckCircle2, Upload, Cpu, Search, FileCheck, Quote, ChevronRight, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ⚙️ Ajuste: número de WhatsApp comercial que recebe os leads.
const WHATSAPP = '5598999999999';

const schema = z.object({
  nome: z.string().min(2, 'Informe seu nome'),
  empresa: z.string().min(2, 'Informe a empresa'),
  whatsapp: z.string().min(8, 'Informe um WhatsApp válido'),
  email: z.string().email('E-mail inválido'),
  volume: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function LandingPage() {
  const [enviado, setEnviado] = useState<FormData | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(d: FormData) {
    setEnviado(d);
    const msg = `Olá! Quero uma demonstração da STILLO IA.%0A%0ANome: ${d.nome}%0AEmpresa: ${d.empresa}%0AWhatsApp: ${d.whatsapp}%0AE-mail: ${d.email}%0AOrçamentos/mês: ${d.volume || '—'}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ───────── NAV ───────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Waves className="h-5 w-5" /></span>
            STILLO <span className="text-primary">IA</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#resultados" className="hover:text-foreground">Resultados</a>
            <a href="#faq" className="hover:text-foreground">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="#demo"><Button size="sm" className="hidden sm:inline-flex">Quero ver funcionando</Button></a>
            <Link to="/dashboard"><Button size="sm" variant="outline"><LogIn className="h-4 w-4" /> Acessar Sistema</Button></Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ───────── HERO ───────── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/60 via-background to-background" />
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Engenharia comercial de piscinas com IA
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Do projeto ao orçamento técnico em <span className="text-primary">minutos</span> — não em dias.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                A STILLO lê o projeto da piscina, dimensiona pela engenharia e monta o orçamento com os produtos certos do <strong>seu</strong> catálogo. Sua equipe fecha mais propostas, com mais precisão e menos retrabalho.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#demo"><Button size="lg" className="text-base">Quero ver funcionando <ArrowRight className="h-5 w-5" /></Button></a>
                <Link to="/dashboard"><Button size="lg" variant="outline" className="text-base"><LogIn className="h-5 w-5" /> Acessar Sistema</Button></Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Demonstração gratuita • sem compromisso • em 20 minutos você vê seu primeiro orçamento.</p>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <Metric valor="10x" label="mais rápido por orçamento" />
                <Metric valor="< 10 min" label="do projeto à proposta" />
                <Metric valor="0" label="SKU inventado pela IA" />
              </div>
            </div>
            <HeroMock />
          </div>
        </section>

        {/* ───────── TRUST BAR ───────── */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
            Construtoras, piscineiros e lojas de piscina usam a STILLO para orçar mais rápido e com padrão técnico.
          </div>
        </section>

        {/* ───────── PROBLEMA ───────── */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Cada orçamento manual custa caro</h2>
            <p className="mt-3 text-muted-foreground">Você reconhece a cena: o projeto chega e começa o gargalo.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Pain titulo="Horas lendo o projeto" texto="Um especialista gasta 1–2h interpretando cada PDF e planta — tempo que não vira venda." />
            <Pain titulo="Conhecimento numa cabeça só" texto="O dimensionamento depende da pessoa-chave. Se ela sai (ou tira férias), a empresa para." />
            <Pain titulo="SKU errado ou descontinuado" texto="Buscar produto em catálogo PDF é lento e dá margem a erro — e retrabalho com o cliente." />
            <Pain titulo="Orçamento inconsistente" texto="Dois vendedores, o mesmo projeto, dois resultados diferentes. Margem imprevisível." />
            <Pain titulo="Proposta que demora dias" texto="Enquanto você monta, o cliente esfria — ou fecha com o concorrente mais rápido." />
            <Pain titulo="Sem rastreabilidade" texto="Ninguém sabe explicar por que aquele item entrou. Difícil revisar, difícil justificar." />
          </div>
        </section>

        {/* ───────── MECANISMO / COMO FUNCIONA ───────── */}
        <section id="como-funciona" className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">O motor de engenharia comercial</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Quatro passos, do projeto à proposta</h2>
              <p className="mt-3 text-muted-foreground">A IA propõe, sua equipe revisa e aprova. Você no controle — só que 10x mais rápido.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-4">
              <Step n="1" icon={Upload} titulo="Leitura inteligente" texto="Suba o PDF/planta. A IA (OCR + visão) identifica piscinas, dimensões e sistemas — com nível de confiança." />
              <Step n="2" icon={Cpu} titulo="Dimensionamento" texto="O motor de regras de engenharia calcula filtragem, LED, aquecimento, tratamento e mão de obra — de forma determinística." />
              <Step n="3" icon={Search} titulo="Produto certo" texto="A busca por IA liga cada necessidade a um SKU real do seu catálogo. Nunca inventa produto." />
              <Step n="4" icon={FileCheck} titulo="Orçamento + envio" texto="Proposta montada, revisada e exportada em PDF, Word ou Excel. Pronta para o cliente." />
            </div>
          </div>
        </section>

        {/* ───────── RECURSOS / BENEFÍCIOS ───────── */}
        <section id="recursos" className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Feito para vender mais — e errar menos</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Benefit icon={Clock} titulo="10x mais rápido" texto="De ~60 minutos para menos de 10 por orçamento. Mais propostas no mesmo dia." />
            <Benefit icon={Ruler} titulo="Padrão de engenharia" texto="Regras cadastráveis pelo admin, sem programar. A política da empresa aplicada igual para todos." />
            <Benefit icon={Brain} titulo="Aprende com a equipe" texto="Cada correção humana vira estatística, padrão e conhecimento. O sistema melhora com o uso." />
            <Benefit icon={Package} titulo="Seu catálogo, seus preços" texto="Suba catálogos (PDF/Excel/CSV) e a IA passa a sugerir os SKUs e valores que são seus." />
            <Benefit icon={FileText} titulo="Rastreabilidade total" texto="Todo item mostra a origem: qual regra, qual cálculo, qual produto. Fácil revisar e justificar." />
            <Benefit icon={ShieldCheck} titulo="Seguro e multiusuário" texto="Perfis e permissões (admin, gerente, orçamentista, comercial, diretoria), dados isolados e auditados." />
          </div>
        </section>

        {/* ───────── RESULTADOS / PROVA ───────── */}
        <section id="resultados" className="border-y bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">O que muda na prática</h2>
                <div className="mt-8 space-y-4">
                  <Compare antes="Orçamento leva 1 a 3 dias" depois="Orçamento em minutos, ainda com o cliente quente" />
                  <Compare antes="Depende do especialista" depois="Qualquer orçamentista entrega no mesmo padrão" />
                  <Compare antes="Erro de SKU e retrabalho" depois="Produto certo do catálogo, rastreável" />
                  <Compare antes="Margem imprevisível" depois="Consistência e visão de margem por proposta" />
                </div>
              </div>
              <figure className="rounded-2xl border bg-card p-8 shadow-sm">
                <Quote className="h-8 w-8 text-primary/40" />
                <blockquote className="mt-4 text-lg leading-relaxed">
                  "Antes a gente perdia obra por demora no orçamento. Com a STILLO, o vendedor sai da visita e a proposta já está pronta. Virou nosso diferencial comercial."
                </blockquote>
                <figcaption className="mt-5 text-sm text-muted-foreground">
                  <strong className="text-foreground">Diretor comercial</strong> · construtora de piscinas (piloto)
                </figcaption>
                <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-6 text-center">
                  <Metric valor="60→8 min" label="tempo médio" />
                  <Metric valor="+40%" label="propostas/mês" />
                  <Metric valor="100%" label="rastreável" />
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* ───────── FAQ ───────── */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
          <div className="mt-10 space-y-3">
            <Faq q="Preciso trocar meu sistema atual?" a="Não. A STILLO complementa seu fluxo: foca em transformar projeto em orçamento técnico. Você continua faturando onde já fatura." />
            <Faq q="Funciona com o meu catálogo e meus preços?" a="Sim. Você sobe seus catálogos (PDF, Excel ou CSV) e cadastra seus produtos. A IA passa a sugerir os SKUs e valores que são seus." />
            <Faq q="E se a IA errar?" a="O dimensionamento é determinístico (motor de regras), e a IA só sugere — sua equipe revisa e aprova tudo. Nada é enviado sem o humano confirmar." />
            <Faq q="Minha equipe precisa entender de tecnologia?" a="Não. A experiência é simples como usar um app moderno: subir o projeto, conferir e exportar. Pensado para quem tem pouca afinidade com computador." />
            <Faq q="Meus dados ficam seguros?" a="Sim. Cada empresa tem seus dados isolados, com perfis de acesso, auditoria completa e chaves sensíveis criptografadas." />
            <Faq q="Quanto tempo para começar a usar?" a="Em uma demonstração de 20 minutos você já vê o primeiro orçamento. A ativação com seu catálogo é rápida — nossa equipe te acompanha." />
          </div>
        </section>

        {/* ───────── FORMULÁRIO (CONVERSÃO) ───────── */}
        <section id="demo" className="border-t bg-muted/30">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Veja a STILLO orçando o seu projeto</h2>
              <p className="mt-4 text-muted-foreground">
                Agende uma demonstração gratuita. Em 20 minutos mostramos, com um projeto real, como sua equipe sai de horas para minutos por orçamento.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem compromisso e sem instalar nada</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Demonstração com caso real de piscina</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Resposta em até 1 dia útil</li>
              </ul>
              <div className="mt-6">
                <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Prefere explorar agora? Acessar o sistema <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              {enviado ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
                  <h3 className="mt-4 text-xl font-semibold">Recebemos, {enviado.nome.split(' ')[0]}! 🎉</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Nossa equipe entra em contato em até 1 dia útil. Se preferir adiantar, fale agora no WhatsApp.</p>
                  <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex"><Button size="lg"><MessageCircle className="h-5 w-5" /> Falar no WhatsApp</Button></a>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <h3 className="text-lg font-semibold">Agendar demonstração</h3>
                  <Field label="Seu nome" error={errors.nome?.message}><Input placeholder="Ex.: João Pereira" {...register('nome')} /></Field>
                  <Field label="Empresa" error={errors.empresa?.message}><Input placeholder="Ex.: Piscinas Premium" {...register('empresa')} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="WhatsApp" error={errors.whatsapp?.message}><Input placeholder="(00) 90000-0000" {...register('whatsapp')} /></Field>
                    <Field label="E-mail" error={errors.email?.message}><Input type="email" placeholder="voce@empresa.com" {...register('email')} /></Field>
                  </div>
                  <Field label="Quantos orçamentos por mês? (opcional)">
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register('volume')} defaultValue="">
                      <option value="" disabled>Selecione...</option>
                      <option>Até 10</option><option>11 a 30</option><option>31 a 80</option><option>Mais de 80</option>
                    </select>
                  </Field>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>Quero minha demonstração <ArrowRight className="h-5 w-5" /></Button>
                  <p className="text-center text-xs text-muted-foreground">Seus dados ficam só com a gente. Sem spam.</p>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ───────── CTA FINAL ───────── */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Pare de perder propostas para a lentidão.</h2>
            <p className="max-w-xl text-primary-foreground/80">Coloque a engenharia da sua empresa para trabalhar na velocidade da venda.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="#demo"><Button size="lg" variant="secondary" className="text-base">Quero ver funcionando <ArrowRight className="h-5 w-5" /></Button></a>
              <Link to="/dashboard"><Button size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-base text-primary-foreground hover:bg-primary-foreground/10"><LogIn className="h-5 w-5" /> Acessar Sistema</Button></Link>
            </div>
          </div>
        </section>

        {/* ───────── FOOTER ───────── */}
        <footer className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
            <span className="flex items-center gap-2"><Waves className="h-4 w-4 text-primary" /> STILLO IA Engineering</span>
            <span>© 2026 · uma solução VAI Tecnologia</span>
            <Link to="/dashboard" className="hover:text-foreground">Acessar Sistema →</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ── subcomponentes ───────────────────────────────────────────────────────────
function Metric({ valor, label }: { valor: string; label: string }) {
  return <div><div className="text-2xl font-bold text-primary">{valor}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
function Pain({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="rounded-xl border bg-card p-5"><div className="font-semibold">{titulo}</div><p className="mt-1 text-sm text-muted-foreground">{texto}</p></div>;
}
function Step({ n, icon: Icon, titulo, texto }: { n: string; icon: any; titulo: string; texto: string }) {
  return (
    <div className="relative rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
        <span className="text-3xl font-bold text-muted/30">{n}</span>
      </div>
      <div className="font-semibold">{titulo}</div>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
function Benefit({ icon: Icon, titulo, texto }: { icon: any; titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
      <div className="mt-4 font-semibold">{titulo}</div>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
function Compare({ antes, depois }: { antes: string; depois: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
      <span className="flex-1 text-muted-foreground line-through">{antes}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 font-medium">{depois}</span>
    </div>
  );
}
function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg border bg-card p-4">
      <summary className="flex cursor-pointer items-center justify-between font-medium">{q}<ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" /></summary>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </details>
  );
}
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div className="space-y-1"><label className="text-sm font-medium">{label}</label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
function HeroMock() {
  return (
    <div className="relative">
      <div className="rounded-2xl border bg-card p-3 shadow-2xl">
        <div className="mb-3 flex items-center gap-1.5 px-1"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="ml-2 text-xs text-muted-foreground">stillo.vai-sistema.com</span></div>
        <div className="rounded-lg bg-gradient-to-br from-accent/50 to-background p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">Orçamento #1042 · pronto</div>
          <div className="mt-3 space-y-2">
            {[['Refletor LED de embutir', 'LED-1801', '16 un'], ['Motobomba + filtro', 'BMB-050', '1 un'], ['Trocador de calor', 'TC-40000', '1 un']].map(([d, sku, q]) => (
              <div key={sku} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
                <span>{d} <span className="ml-1 font-mono text-xs text-primary">{sku}</span></span>
                <span className="text-muted-foreground">{q}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <span>Total</span><span>R$ 12.480,00</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Gerado por IA em 7 minutos a partir do PDF do projeto</div>
        </div>
      </div>
    </div>
  );
}
