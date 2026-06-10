import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Users, Loader2, UserPlus } from 'lucide-react';
import { clientesApi, type Cliente, type ClienteInput } from '@/lib/clientes.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';

const schema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  documento: z.string().optional(),
  telefone: z.string().optional(),
  observacoes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function ClientesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', q],
    queryFn: () => clientesApi.list({ q: q || undefined }),
  });

  const upsert = useMutation({
    mutationFn: (vals: ClienteInput) =>
      editing ? clientesApi.update(editing.id, vals) : clientesApi.create(vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => clientesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setToDelete(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Cliente) {
    setEditing(c);
    setDialogOpen(true);
  }

  const clientes = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="h-6 w-6 text-primary" /> Clientes
        </h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo cliente</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">Documento</th>
              <th className="p-3 font-medium">Contato</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            )}
            {!isLoading && clientes.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <UserPlus className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{q ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado'}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {q ? ('Sem correspondência para "' + q + '". Tente outro termo.') : 'Cadastre o primeiro cliente para começar a gerar orçamentos.'}
                      </p>
                    </div>
                    {!q && (
                      <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4" /> Cadastrar primeiro cliente
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{c.nome}</td>
                <td className="p-3 text-muted-foreground">{c.documento ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{c.contatos?.[0]?.valor ?? '—'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(c)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ClienteDialog
        key={editing?.id ?? 'novo'}
        open={dialogOpen}
        editing={editing}
        saving={upsert.isPending}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSubmit={(vals) => upsert.mutate(vals)}
      />

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir "${toDelete?.nome}"? Esta ação pode ser revertida pela auditoria.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>
              {del.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">O cliente sairá das listagens (soft-delete).</p>
      </Dialog>
    </div>
  );
}

function ClienteDialog({
  open, editing, saving, onClose, onSubmit,
}: {
  open: boolean;
  editing: Cliente | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (vals: ClienteInput) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: editing?.nome ?? '',
      documento: editing?.documento ?? '',
      telefone: editing?.contatos?.[0]?.valor ?? '',
      observacoes: editing?.observacoes ?? '',
    },
  });

  function submit(d: FormData) {
    onSubmit({
      nome: d.nome,
      documento: d.documento || undefined,
      contatos: d.telefone ? [{ tipo: 'telefone', valor: d.telefone }] : undefined,
      observacoes: d.observacoes || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="cliente-form" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </>
      }
    >
      <form id="cliente-form" onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="nome">Nome *</Label>
          <Input id="nome" {...register('nome')} />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="documento">Documento (CPF/CNPJ)</Label>
          <Input id="documento" {...register('documento')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="telefone">Telefone / WhatsApp</Label>
          <Input id="telefone" {...register('telefone')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="observacoes">Observações</Label>
          <Input id="observacoes" {...register('observacoes')} />
        </div>
      </form>
    </Dialog>
  );
}
