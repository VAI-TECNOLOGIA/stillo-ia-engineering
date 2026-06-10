import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Save, CheckCircle2, Loader2, FileText, AlertTriangle, CloudUpload } from 'lucide-react';
import { leituraApi, SISTEMAS, type PiscinaExtraida, type ProjetoExtraido, type Sistema } from '@/lib/leitura.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function LeituraPage() {
  const { obraId = '' } = useParams();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<ProjetoExtraido | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const arquivos = useQuery({ queryKey: ['arquivos', obraId], queryFn: () => leituraApi.listArquivos(obraId) });

  const leitura = useQuery({
    queryKey: ['leitura', obraId],
    queryFn: () => leituraApi.obter(obraId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'PENDENTE' || s === 'PROCESSANDO' ? 1500 : false;
    },
    refetchIntervalInBackground: true,
  });

  // Sincroniza o estado editável quando uma nova leitura chega.
  useEffect(() => {
    if (leitura.data?.resultado) setLocal(leitura.data.resultado);
  }, [leitura.data?.id, leitura.data?.status]);

  const upload = useMutation({
    mutationFn: (file: File) => {
      setUploadPct(0);
      return leituraApi.upload(obraId, file, (pct) => setUploadPct(pct));
    },
    onSuccess: () => { setUploadPct(null); qc.invalidateQueries({ queryKey: ['arquivos', obraId] }); },
    onError: () => setUploadPct(null),
  });
  const disparar = useMutation({
    mutationFn: () => leituraApi.disparar(obraId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leitura', obraId] }); // mostra "processando"
      // garante o reveal mesmo se o polling pausar (aba sem foco)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['leitura', obraId] }), 2500);
    },
  });
  const corrigir = useMutation({
    mutationFn: () => leituraApi.corrigir(leitura.data!.id, local!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leitura', obraId] }),
  });
  const aplicar = useMutation({
    mutationFn: () => leituraApi.aplicar(leitura.data!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leitura', obraId] }),
  });

  function updatePiscina(i: number, patch: Partial<PiscinaExtraida>) {
    setLocal((prev) => {
      if (!prev) return prev;
      const piscinas = prev.piscinas.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
      return { ...prev, piscinas };
    });
  }
  function toggleSistema(i: number, s: Sistema) {
    setLocal((prev) => {
      if (!prev) return prev;
      const piscinas = prev.piscinas.map((p, idx) => {
        if (idx !== i) return p;
        const has = p.sistemas.includes(s);
        return { ...p, sistemas: has ? p.sistemas.filter((x) => x !== s) : [...p.sistemas, s] };
      });
      return { ...prev, piscinas };
    });
  }

  const status = leitura.data?.status;
  const processando = status === 'PENDENTE' || status === 'PROCESSANDO';
  const temArquivo = (arquivos.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/obras"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" /> Leitura Inteligente
          </h1>
          <p className="text-muted-foreground">Suba o projeto e deixe a IA extrair piscinas, dimensões e sistemas.</p>
        </div>
      </div>

      {/* Arquivos */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Arquivos da obra</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.doc,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
            {upload.isPending ? `Enviando${uploadPct !== null ? ` ${uploadPct}%` : '...'}` : 'Enviar PDF / planta / imagem'}
          </Button>
          {upload.isPending && uploadPct !== null && (
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          <ul className="space-y-1 text-sm">
            {(arquivos.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" /> {a.nomeOriginal} <span className="text-xs">({a.tipo})</span>
              </li>
            ))}
            {!temArquivo && <li className="text-muted-foreground">Nenhum arquivo ainda.</li>}
          </ul>
        </CardContent>
      </Card>

      {/* Disparo */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Ler com IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => disparar.mutate()} disabled={!temArquivo || disparar.isPending || processando}>
            {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {processando ? 'Lendo projeto...' : 'Ler projeto com IA'}
          </Button>
          {status && <StatusLeitura status={status} erro={leitura.data?.erro} conf={leitura.data?.ocrConfianca} />}
          {disparar.isError && <p className="text-sm text-destructive">Falha ao iniciar. A OpenAI está vinculada em Configurações?</p>}
        </CardContent>
      </Card>

      {/* Revisão */}
      {local && leitura.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              3. Revisão técnica
              <span className="text-xs font-normal text-muted-foreground">Campos em âmbar precisam de conferência</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {local.piscinas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma piscina extraída. Adicione manualmente ou revise o arquivo.</p>}

            {local.piscinas.map((p, i) => (
              <div key={i} className={cn('rounded-lg border p-4', p.confianca < 0.6 && 'border-amber-300 bg-amber-50/40')}>
                <div className="mb-3 flex items-center justify-between">
                  <Input className="max-w-xs font-medium" value={p.nome ?? ''} placeholder={`Piscina ${i + 1}`} onChange={(e) => updatePiscina(i, { nome: e.target.value })} />
                  <ConfiancaBadge valor={p.confianca} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Campo label="Comprimento (m)" value={p.comprimentoM} onChange={(v) => updatePiscina(i, { comprimentoM: v })} />
                  <Campo label="Largura (m)" value={p.larguraM} onChange={(v) => updatePiscina(i, { larguraM: v })} />
                  <Campo label="Profundidade (m)" value={p.profundidadeM} onChange={(v) => updatePiscina(i, { profundidadeM: v })} />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={p.tipo ?? 'EXTERNA'} onChange={(e) => updatePiscina(i, { tipo: e.target.value as 'INTERNA' | 'EXTERNA' })}>
                      <option value="EXTERNA">Externa</option>
                      <option value="INTERNA">Interna</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground">Sistemas</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {SISTEMAS.map((s) => {
                      const on = p.sistemas.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleSistema(i, s)}
                          className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background text-muted-foreground hover:bg-accent')}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {local.avisos.length > 0 && (
              <ul className="list-inside list-disc text-sm text-amber-600">
                {local.avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => corrigir.mutate()} disabled={corrigir.isPending}>
                <Save className="h-4 w-4" /> {corrigir.isPending ? 'Salvando...' : 'Salvar correções'}
              </Button>
              <Button onClick={() => aplicar.mutate()} disabled={aplicar.isPending || local.piscinas.length === 0}>
                <CheckCircle2 className="h-4 w-4" /> {aplicar.isPending ? 'Aplicando...' : 'Confirmar e criar piscinas'}
              </Button>
              {aplicar.isSuccess && <span className="self-center text-sm text-emerald-600">{aplicar.data.piscinasCriadas} piscina(s) criada(s) ✓</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Campo({ label, value, onChange }: { label: string; value?: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type="number" step="0.1" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
    </div>
  );
}

function ConfiancaBadge({ valor }: { valor: number }) {
  const pct = Math.round(valor * 100);
  const cls = valor >= 0.8 ? 'bg-emerald-100 text-emerald-700' : valor >= 0.6 ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700';
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cls)}>Confiança {pct}%</span>;
}

function StatusLeitura({ status, erro, conf }: { status: string; erro?: string | null; conf?: number | null }) {
  const map: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
    PENDENTE: { label: 'Na fila...', cls: 'text-muted-foreground', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    PROCESSANDO: { label: 'Processando OCR + IA...', cls: 'text-sky-600', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    REVISAO_MANUAL: { label: 'Concluído — requer revisão', cls: 'text-amber-600', icon: <AlertTriangle className="h-4 w-4" /> },
    CONCLUIDO: { label: 'Concluído', cls: 'text-emerald-600', icon: <CheckCircle2 className="h-4 w-4" /> },
    FALHA: { label: `Falhou: ${erro ?? ''}`, cls: 'text-destructive', icon: <AlertTriangle className="h-4 w-4" /> },
  };
  const s = map[status] ?? map.PENDENTE;
  return (
    <div className={cn('flex items-center gap-2 text-sm', s.cls)}>
      {s.icon} {s.label}
      {typeof conf === 'number' && status !== 'PROCESSANDO' && <span className="text-xs text-muted-foreground">(OCR {Math.round(conf * 100)}%)</span>}
    </div>
  );
}
