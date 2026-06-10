import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, Pencil, Trash2, Plus, CheckCircle2, Save, Loader2,
  FileDown, FileSpreadsheet, FileType, Copy, Check, PartyPopper,
} from 'lucide-react';
import { orcamentosApi, type FormatoExport, type OrcItem, type OrcamentoStatus } from '@/lib/orcamentos.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL, cn } from '@/lib/utils';

const STATUS_CLS: Record<OrcamentoStatus, string> = {
  RASCUNHO: 'bg-muted text-muted-foreground', EM_REVISAO: 'bg-sky-100 text-sky-700',
  APROVADO: 'bg-emerald-100 text-emerald-700', ENVIADO: 'bg-indigo-100 text-indigo-700', RECUSADO: 'bg-destructive/10 text-destructive',
};
const ORIGEM_CLS: Record<string, string> = { REGRA: 'bg-accent text-accent-foreground', IA_RAG: 'bg-violet-100 text-violet-700', MANUAL: 'bg-amber-100 text-amber-700' };

export function OrcamentoPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [editItem, setEditItem] = useState<OrcItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<OrcItem | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Banner de sucesso quando vem do fluxo de geração
  useEffect(() => {
    if ((location.state as { geradoAgora?: boolean } | null)?.geradoAgora) {
      setShowBanner(true);
      const t = setTimeout(() => setShowBanner(false), 6000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const { data: orc, isLoading } = useQuery({ queryKey: ['orcamento', id], queryFn: () => orcamentosApi.get(id) });
  const inval = () => qc.invalidateQueries({ queryKey: ['orcamento', id] });

  const upd = useMutation({ mutationFn: (v: { itemId: string; dto: Record<string, unknown> }) => orcamentosApi.atualizarItem(id, v.itemId, v.dto), onSuccess: () => { inval(); setEditItem(null); } });
  const add = useMutation({ mutationFn: (dto: { descricao: string; quantidade: number; precoUnit: number; justificativa?: string }) => orcamentosApi.adicionarItem(id, dto), onSuccess: () => { inval(); setAdding(false); } });
  const del = useMutation({ mutationFn: (v: { itemId: string; justificativa?: string }) => orcamentosApi.removerItem(id, v.itemId, v.justificativa), onSuccess: () => { inval(); setToDelete(null); } });
  const aprovar = useMutation({ mutationFn: () => orcamentosApi.aprovar(id), onSuccess: inval });
  const versao = useMutation({ mutationFn: () => orcamentosApi.criarVersao(id), onSuccess: inval });

  async function exportar(formato: FormatoExport) {
    const conteudo = await orcamentosApi.exportar(id, formato);
    if (formato === 'txt') {
      await navigator.clipboard.writeText(conteudo);
      setCopiado(true); setTimeout(() => setCopiado(false), 1500);
      return;
    }
    if (formato === 'pdf') {
      const w = window.open('', '_blank');
      if (w) { w.document.write(conteudo); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); }
      return;
    }
    const mime = formato === 'doc' ? 'application/msword' : 'text/csv';
    const blob = new Blob([conteudo], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orcamento-${orc?.numero}.${formato}`; a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !orc) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  const editavel = orc.status !== 'APROVADO' && orc.status !== 'ENVIADO';

  return (
    <div className="space-y-6">
      {/* Banner de sucesso — aparece após geração via fluxo IA */}
      {showBanner && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 animate-in slide-in-from-top-2 duration-300">
          <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">Orçamento gerado com sucesso! 🎉</p>
            <p className="text-sm text-emerald-700">A IA montou o orçamento técnico completo. Revise os itens e exporte quando estiver pronto.</p>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-emerald-500 hover:text-emerald-700">
            <Check className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link to="/orcamentos"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileText className="h-6 w-6 text-primary" /> Orçamento #{orc.numero}
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLS[orc.status])}>{orc.status}</span>
          </h1>
          <p className="text-muted-foreground">{orc.obra?.nome} · {orc.obra?.cliente?.nome} · v{orc.versaoAtual}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Revisão técnica</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => exportar('pdf')}><FileDown className="h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => exportar('doc')}><FileType className="h-4 w-4" /> Word</Button>
            <Button variant="outline" size="sm" onClick={() => exportar('csv')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={() => exportar('txt')}>{copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Texto</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr><th className="p-2">Item</th><th className="p-2 text-right">Qtd</th><th className="p-2 text-right">Preço</th><th className="p-2 text-right">Subtotal</th>{editavel && <th className="p-2"></th>}</tr>
              </thead>
              <tbody>
                {orc.itens.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">
                      <div>{it.descricao}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        {it.produto && <span className="font-mono text-primary">{it.produto.sku}</span>}
                        <span className={cn('rounded-full px-1.5 py-0.5', ORIGEM_CLS[it.origem])}>{it.origem}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right">{it.quantidade}</td>
                    <td className="p-2 text-right">{formatBRL(Number(it.precoUnit))}</td>
                    <td className="p-2 text-right font-medium">{formatBRL(Number(it.subtotal))}</td>
                    {editavel && (
                      <td className="p-2"><div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditItem(it)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(it)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div></td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30"><td className="p-2 font-semibold" colSpan={3}>Total</td><td className="p-2 text-right text-base font-bold text-primary">{formatBRL(Number(orc.valorTotal))}</td>{editavel && <td />}</tr>
              </tfoot>
            </table>
          </div>

          {editavel && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Adicionar item</Button>
              <Button variant="outline" size="sm" onClick={() => versao.mutate()} disabled={versao.isPending}><Save className="h-4 w-4" /> Salvar versão</Button>
              {hasPermission('orcamento:aprovar') && (
                <Button size="sm" onClick={() => aprovar.mutate()} disabled={aprovar.isPending}><CheckCircle2 className="h-4 w-4" /> Aprovar</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editar / adicionar item */}
      {editItem && <ItemDialog item={editItem} saving={upd.isPending} onClose={() => setEditItem(null)} onSubmit={(d) => upd.mutate({ itemId: editItem.id, dto: d })} />}
      {adding && <ItemDialog item={null} saving={add.isPending} onClose={() => setAdding(false)} onSubmit={(d) => add.mutate({ descricao: d.descricao ?? '', quantidade: d.quantidade ?? 1, precoUnit: d.precoUnit ?? 0, justificativa: d.justificativa })} />}

      <Dialog
        open={!!toDelete} onClose={() => setToDelete(null)} title="Remover item"
        description={`Remover "${toDelete?.descricao}"? Justifique para registrar o aprendizado.`}
        footer={<><Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button><Button variant="destructive" disabled={del.isPending} onClick={() => toDelete && del.mutate({ itemId: toDelete.id, justificativa: 'Removido na revisão' })}>Remover</Button></>}
      ><p className="text-sm text-muted-foreground">A remoção é registrada como correção (aprendizado).</p></Dialog>
    </div>
  );
}

function ItemDialog({ item, saving, onClose, onSubmit }: {
  item: OrcItem | null; saving: boolean; onClose: () => void;
  onSubmit: (d: { descricao?: string; quantidade?: number; precoUnit?: number; justificativa?: string }) => void;
}) {
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(item?.quantidade ?? 1);
  const [precoUnit, setPrecoUnit] = useState(Number(item?.precoUnit ?? 0));
  const [justificativa, setJustificativa] = useState('');

  return (
    <Dialog
      open onClose={onClose} title={item ? 'Editar item' : 'Adicionar item'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={saving || !descricao} onClick={() => onSubmit({ descricao, quantidade, precoUnit, justificativa: justificativa || undefined })}>{saving ? 'Salvando...' : 'Salvar'}</Button></>}
    >
      <div className="space-y-3">
        <div className="space-y-1"><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Quantidade</Label><Input type="number" step="0.01" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>Preço unit. (R$)</Label><Input type="number" step="0.01" value={precoUnit} onChange={(e) => setPrecoUnit(Number(e.target.value))} /></div>
        </div>
        <div className="space-y-1"><Label>Justificativa {item ? '(alimenta o aprendizado)' : ''}</Label><Input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="ex.: cliente pediu modelo superior" /></div>
      </div>
    </Dialog>
  );
}
