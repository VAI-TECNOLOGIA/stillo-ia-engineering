import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Play, SlidersHorizontal, Power, X } from 'lucide-react';
import { regrasApi, CATEGORIAS, type Regra, type RegraCategoria, type RegraInput, type SimulacaoResultado } from '@/lib/regras.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const FATOS = [
  'piscina.volumeM3', 'piscina.areaM2', 'piscina.perimetroM', 'piscina.comprimentoM',
  'piscina.larguraM', 'piscina.profundidadeM', 'piscina.tipo', 'piscina.interna',
  'piscina.sistemas', 'obra.regiao', 'obra.cidade', 'obra.uf',
];
const OPERADORES = ['=', '!=', '>', '>=', '<', '<=', 'in', 'contem', 'entre'];
const SELECT_CLS = 'flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface CondForm { fato: string; op: string; valor: string }
type AcaoForm =
  | { tipo: 'ADICIONAR_ITEM'; categoria: string; descricao: string; quantidade: string; unidade: string }
  | { tipo: 'AVISO'; mensagem: string };

export function RegrasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Regra | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Regra | null>(null);

  const { data: regras, isLoading } = useQuery({ queryKey: ['regras'], queryFn: () => regrasApi.list() });

  const save = useMutation({
    mutationFn: (payload: RegraInput) => (editing ? regrasApi.update(editing.id, payload) : regrasApi.create(payload)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regras'] }); setOpen(false); setEditing(null); },
  });
  const toggle = useMutation({
    mutationFn: (r: Regra) => regrasApi.update(r.id, { ativo: !r.ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regras'] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => regrasApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regras'] }); setToDelete(null); },
  });

  const lista = regras ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <SlidersHorizontal className="h-6 w-6 text-primary" /> Motor de Regras
          </h1>
          <p className="text-muted-foreground">Regras de engenharia editáveis sem programar — o coração do dimensionamento.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nova regra</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Regra</th>
              <th className="p-3 font-medium">Categoria</th>
              <th className="p-3 font-medium">Prior.</th>
              <th className="p-3 font-medium">Ativa</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && lista.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma regra. Crie a primeira (ex.: "LED a cada 1,5m").</td></tr>}
            {lista.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3">
                  <div className="font-medium">{r.nome}</div>
                  <div className="text-xs text-muted-foreground">v{r.versao}</div>
                </td>
                <td className="p-3"><span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{r.categoria}</span></td>
                <td className="p-3 text-muted-foreground">{r.prioridade}</td>
                <td className="p-3">
                  <button onClick={() => toggle.mutate(r)} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', r.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                    <Power className="h-3 w-3" /> {r.ativo ? 'Ativa' : 'Inativa'}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(r)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open && (
        <RegraEditor
          key={editing?.id ?? 'nova'}
          editing={editing}
          saving={save.isPending}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSubmit={(p) => save.mutate(p)}
        />
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir regra"
        description={`Excluir "${toDelete?.nome}"? Considere apenas desativá-la para manter o histórico.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>Excluir</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">A regra e suas versões serão removidas.</p>
      </Dialog>
    </div>
  );
}

// ── Editor visual ────────────────────────────────────────────────────────────

function RegraEditor({ editing, saving, onClose, onSubmit }: {
  editing: Regra | null; saving: boolean; onClose: () => void; onSubmit: (p: RegraInput) => void;
}) {
  const inicial = editing ? parseRegra(editing) : novaRegra();
  const [nome, setNome] = useState(inicial.nome);
  const [categoria, setCategoria] = useState<RegraCategoria>(inicial.categoria);
  const [prioridade, setPrioridade] = useState(inicial.prioridade);
  const [ativo, setAtivo] = useState(inicial.ativo);
  const [combinador, setCombinador] = useState<'todas' | 'alguma'>(inicial.combinador);
  const [conds, setConds] = useState<CondForm[]>(inicial.conds);
  const [acoes, setAcoes] = useState<AcaoForm[]>(inicial.acoes);
  const [sim, setSim] = useState<SimulacaoResultado | null>(null);
  const [simErro, setSimErro] = useState<string | null>(null);

  function payload(): RegraInput {
    return { nome, categoria, prioridade, ativo, quando: buildQuando(combinador, conds), entao: buildEntao(acoes) };
  }

  async function simular() {
    setSimErro(null);
    try {
      const regra = { id: 'preview', nome: nome || 'preview', categoria, prioridade, ativo: true, ...{ quando: buildQuando(combinador, conds), entao: buildEntao(acoes) } };
      const piscina = { comprimentoM: 8, larguraM: 4, profundidadeM: 1.5, tipo: 'EXTERNA', sistemas: ['LED', 'AQUECIMENTO'] };
      const res = await regrasApi.simular(regra, piscina, { regiao: 'NORDESTE' });
      setSim(res);
    } catch {
      setSimErro('Falha ao simular. A API está rodando?');
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Editar regra (v${editing.versao})` : 'Nova regra'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSubmit(payload())} disabled={saving || !nome}>{saving ? 'Salvando...' : 'Salvar regra'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: LED a cada 1,5m de borda" />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <select className={SELECT_CLS} value={categoria} onChange={(e) => setCategoria(e.target.value as RegraCategoria)}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Input type="number" value={prioridade} onChange={(e) => setPrioridade(Number(e.target.value))} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativa</label>
            </div>
          </div>
        </div>

        {/* QUANDO */}
        <section className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold">QUANDO</span>
            <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={combinador} onChange={(e) => setCombinador(e.target.value as 'todas' | 'alguma')}>
              <option value="todas">todas (E)</option>
              <option value="alguma">alguma (OU)</option>
            </select>
            <span className="text-xs text-muted-foreground">as condições abaixo</span>
          </div>
          <div className="space-y-2">
            {conds.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className={cn(SELECT_CLS, 'flex-1')} value={c.fato} onChange={(e) => setConds(upd(conds, i, { fato: e.target.value }))}>
                  {FATOS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select className="h-10 w-20 rounded-md border border-input bg-background px-1 text-sm" value={c.op} onChange={(e) => setConds(upd(conds, i, { op: e.target.value }))}>
                  {OPERADORES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <Input className="w-28" value={c.valor} onChange={(e) => setConds(upd(conds, i, { valor: e.target.value }))} placeholder="valor" />
                <Button variant="ghost" size="icon" onClick={() => setConds(conds.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setConds([...conds, { fato: FATOS[0], op: '>', valor: '0' }])}><Plus className="h-3 w-3" /> condição</Button>
          </div>
        </section>

        {/* ENTÃO */}
        <section className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold">ENTÃO</div>
          <div className="space-y-3">
            {acoes.map((a, i) => (
              <div key={i} className="rounded-md border bg-muted/30 p-2">
                <div className="mb-2 flex items-center gap-2">
                  <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={a.tipo}
                    onChange={(e) => setAcoes(upd(acoes, i, e.target.value === 'AVISO' ? { tipo: 'AVISO', mensagem: '' } : { tipo: 'ADICIONAR_ITEM', categoria: 'LED', descricao: '', quantidade: '1', unidade: 'un' } as AcaoForm))}>
                    <option value="ADICIONAR_ITEM">Adicionar item</option>
                    <option value="AVISO">Aviso</option>
                  </select>
                  <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setAcoes(acoes.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                </div>
                {a.tipo === 'ADICIONAR_ITEM' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="categoria (ex.: LED)" value={a.categoria} onChange={(e) => setAcoes(upd(acoes, i, { categoria: e.target.value }))} />
                    <Input placeholder="unidade" value={a.unidade} onChange={(e) => setAcoes(upd(acoes, i, { unidade: e.target.value }))} />
                    <Input className="col-span-2" placeholder="descrição" value={a.descricao} onChange={(e) => setAcoes(upd(acoes, i, { descricao: e.target.value }))} />
                    <Input className="col-span-2" placeholder="quantidade (nº ou expressão: teto(piscina.perimetroM/1.5))" value={a.quantidade} onChange={(e) => setAcoes(upd(acoes, i, { quantidade: e.target.value }))} />
                  </div>
                ) : (
                  <Input placeholder="mensagem do aviso" value={a.mensagem} onChange={(e) => setAcoes(upd(acoes, i, { mensagem: e.target.value }))} />
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAcoes([...acoes, { tipo: 'ADICIONAR_ITEM', categoria: '', descricao: '', quantidade: '1', unidade: 'un' }])}><Plus className="h-3 w-3" /> ação</Button>
          </div>
        </section>

        {/* Simulação */}
        <section className="rounded-lg border border-dashed p-3">
          <Button variant="secondary" size="sm" onClick={simular}><Play className="h-4 w-4" /> Simular (piscina 8×4×1,5 c/ LED+aquecimento)</Button>
          {simErro && <p className="mt-2 text-sm text-destructive">{simErro}</p>}
          {sim && (
            <div className="mt-3 space-y-2 text-sm">
              {sim.itens.length === 0 && <p className="text-muted-foreground">Nenhum item gerado (a condição casou?).</p>}
              {sim.itens.map((it, i) => (
                <div key={i} className="flex justify-between rounded bg-muted/40 px-2 py-1">
                  <span><strong>{it.categoria}</strong> — {it.descricao}</span>
                  <span>{it.quantidade} {it.unidade}</span>
                </div>
              ))}
              {sim.avisos.map((a, i) => <p key={i} className="text-amber-600">⚠ {a}</p>)}
            </div>
          )}
        </section>
      </div>
    </Dialog>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function upd<T>(arr: T[], i: number, patch: Partial<T> | T): T[] {
  return arr.map((x, idx) => (idx === i ? ({ ...x, ...patch } as T) : x));
}

function novaRegra() {
  return {
    nome: '', categoria: 'ILUMINACAO' as RegraCategoria, prioridade: 100, ativo: true,
    combinador: 'todas' as const,
    conds: [{ fato: 'piscina.sistemas', op: 'contem', valor: 'LED' }] as CondForm[],
    acoes: [{ tipo: 'ADICIONAR_ITEM', categoria: 'LED', descricao: 'Refletor LED', quantidade: 'teto(piscina.perimetroM / 1.5)', unidade: 'un' }] as AcaoForm[],
  };
}

function parseRegra(r: Regra) {
  const q = r.quando as Record<string, unknown>;
  let combinador: 'todas' | 'alguma' = 'todas';
  let rawConds: unknown[] = [];
  if (q && Array.isArray(q.todas)) { combinador = 'todas'; rawConds = q.todas as unknown[]; }
  else if (q && Array.isArray(q.alguma)) { combinador = 'alguma'; rawConds = q.alguma as unknown[]; }
  else if (q && 'fato' in q) { rawConds = [q]; }
  const conds: CondForm[] = rawConds.map((c) => {
    const cc = c as { fato?: string; op?: string; valor?: unknown };
    return { fato: cc.fato ?? FATOS[0], op: cc.op ?? '=', valor: Array.isArray(cc.valor) ? cc.valor.join(',') : String(cc.valor ?? '') };
  });
  const acoes: AcaoForm[] = (r.entao ?? []).map((a) => {
    const aa = a as Record<string, unknown>;
    if (aa.tipo === 'AVISO') return { tipo: 'AVISO', mensagem: String(aa.mensagem ?? '') };
    return { tipo: 'ADICIONAR_ITEM', categoria: String(aa.categoria ?? ''), descricao: String(aa.descricao ?? ''), quantidade: String(aa.quantidade ?? '1'), unidade: String(aa.unidade ?? 'un') };
  });
  return {
    nome: r.nome, categoria: r.categoria, prioridade: r.prioridade, ativo: r.ativo,
    combinador, conds: conds.length ? conds : novaRegra().conds, acoes: acoes.length ? acoes : novaRegra().acoes,
  };
}

function coerceValor(op: string, raw: string): unknown {
  const t = raw.trim();
  if (op === 'entre') return t.split(',').map((s) => Number(s.trim()));
  if (op === 'in') return t.split(',').map((s) => s.trim());
  const n = Number(t);
  return t !== '' && !Number.isNaN(n) ? n : t;
}

function buildQuando(combinador: 'todas' | 'alguma', conds: CondForm[]): unknown {
  return { [combinador]: conds.map((c) => ({ fato: c.fato, op: c.op, valor: coerceValor(c.op, c.valor) })) };
}

function buildEntao(acoes: AcaoForm[]): unknown[] {
  return acoes.map((a) => {
    if (a.tipo === 'AVISO') return { tipo: 'AVISO', mensagem: a.mensagem };
    const n = Number(a.quantidade);
    const quantidade = a.quantidade.trim() !== '' && !Number.isNaN(n) ? n : a.quantidade;
    return { tipo: 'ADICIONAR_ITEM', categoria: a.categoria, descricao: a.descricao, quantidade, unidade: a.unidade };
  });
}
