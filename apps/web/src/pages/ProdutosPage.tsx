import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Package, Loader2 } from 'lucide-react';
import { produtosApi, type Produto, type ProdutoInput, type ProdutoStatus } from '@/lib/produtos.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { formatBRL, cn } from '@/lib/utils';

const schema = z.object({
  sku: z.string().min(1, 'Informe o SKU'),
  nome: z.string().min(2, 'Informe o nome'),
  categoria: z.string().min(1, 'Informe a categoria'),
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  preco: z.coerce.number().min(0).optional(),
  unidade: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'DESCONTINUADO']).optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_CLS: Record<ProdutoStatus, string> = {
  ATIVO: 'bg-emerald-100 text-emerald-700',
  INATIVO: 'bg-muted text-muted-foreground',
  DESCONTINUADO: 'bg-amber-100 text-amber-700',
};

export function ProdutosPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Produto | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Produto | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['produtos', q], queryFn: () => produtosApi.list({ q: q || undefined }) });

  const save = useMutation({
    mutationFn: (vals: ProdutoInput) => (editing ? produtosApi.update(editing.id, vals) : produtosApi.create(vals)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos'] }); setOpen(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: (id: string) => produtosApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos'] }); setToDelete(null); },
  });

  const produtos = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Package className="h-6 w-6 text-primary" /> Produtos
        </h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Novo produto</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome / SKU / fabricante..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Produto</th>
              <th className="p-3 font-medium">Categoria</th>
              <th className="p-3 font-medium">Preço</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!isLoading && produtos.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum produto. Clique em "Novo produto".</td></tr>}
            {produtos.map((p) => (
              <tr key={p.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3"><div className="font-medium">{p.nome}</div><div className="text-xs text-muted-foreground">{p.fabricante ?? ''} {p.modelo ?? ''}</div></td>
                <td className="p-3 text-muted-foreground">{p.categoria}</td>
                <td className="p-3">{formatBRL(Number(p.preco))}</td>
                <td className="p-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLS[p.status])}>{p.status}</span></td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(p)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open && (
        <ProdutoDialog
          key={editing?.id ?? 'novo'}
          editing={editing}
          saving={save.isPending}
          erro={save.isError ? 'Não foi possível salvar (SKU duplicado?).' : null}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSubmit={(vals) => save.mutate(vals)}
        />
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir produto"
        description={`Excluir "${toDelete?.nome}" (${toDelete?.sku})?`}
        footer={<><Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button><Button variant="destructive" disabled={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>Excluir</Button></>}
      >
        <p className="text-sm text-muted-foreground">O produto sai das listagens (soft-delete).</p>
      </Dialog>
    </div>
  );
}

function ProdutoDialog({ editing, saving, erro, onClose, onSubmit }: {
  editing: Produto | null; saving: boolean; erro: string | null; onClose: () => void; onSubmit: (v: ProdutoInput) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: editing?.sku ?? '', nome: editing?.nome ?? '', categoria: editing?.categoria ?? '',
      fabricante: editing?.fabricante ?? '', modelo: editing?.modelo ?? '',
      preco: editing ? Number(editing.preco) : undefined, unidade: editing?.unidade ?? 'un',
      status: editing?.status ?? 'ATIVO',
    },
  });

  return (
    <Dialog
      open onClose={onClose} title={editing ? 'Editar produto' : 'Novo produto'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button form="produto-form" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></>}
    >
      <form id="produto-form" onSubmit={handleSubmit((d) => onSubmit(d as ProdutoInput))} className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>SKU *</Label><Input {...register('sku')} />{errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}</div>
        <div className="space-y-1"><Label>Categoria *</Label><Input placeholder="ex.: FILTRAGEM" {...register('categoria')} />{errors.categoria && <p className="text-xs text-destructive">{errors.categoria.message}</p>}</div>
        <div className="col-span-2 space-y-1"><Label>Nome *</Label><Input {...register('nome')} />{errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}</div>
        <div className="space-y-1"><Label>Fabricante</Label><Input {...register('fabricante')} /></div>
        <div className="space-y-1"><Label>Modelo</Label><Input {...register('modelo')} /></div>
        <div className="space-y-1"><Label>Preço (R$)</Label><Input type="number" step="0.01" {...register('preco')} /></div>
        <div className="space-y-1"><Label>Unidade</Label><Input {...register('unidade')} /></div>
        {erro && <p className="col-span-2 text-sm text-destructive">{erro}</p>}
      </form>
    </Dialog>
  );
}
