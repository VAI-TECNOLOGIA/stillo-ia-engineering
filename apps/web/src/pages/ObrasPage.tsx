import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Loader2, Waves, FileText, Sparkles, Ruler } from 'lucide-react';
import { obrasApi, type Obra, type ObraInput, type ObraStatus } from '@/lib/obras.api';
import { clientesApi } from '@/lib/clientes.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const schema = z.object({
  clienteId: z.string().min(1, 'Selecione o cliente'),
  nome: z.string().min(2, 'Informe o nome da obra'),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  regiao: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_LABEL: Record<ObraStatus, string> = {
  RASCUNHO: 'Rascunho', EM_LEITURA: 'Em leitura', EM_DIMENSIONAMENTO: 'Dimensionando',
  EM_ORCAMENTO: 'Em orçamento', CONCLUIDA: 'Concluída', ARQUIVADA: 'Arquivada',
};

export function ObrasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['obras'], queryFn: () => obrasApi.list({ limit: 50 }) });

  const create = useMutation({
    mutationFn: (vals: ObraInput) => obrasApi.create(vals),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras'] }); setOpen(false); },
  });

  const obras = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 className="h-6 w-6 text-primary" /> Obras
        </h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova obra</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Obra</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Cidade</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Conteúdo</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            )}
            {!isLoading && obras.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma obra ainda. Crie a primeira.</td></tr>
            )}
            {obras.map((o: Obra) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{o.nome}</td>
                <td className="p-3 text-muted-foreground">{o.cliente?.nome ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{o.cidade ? `${o.cidade}${o.uf ? '/' + o.uf : ''}` : '—'}</td>
                <td className="p-3">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{STATUS_LABEL[o.status]}</span>
                </td>
                <td className="p-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><Waves className="h-3.5 w-3.5" /> {o._count?.piscinas ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {o._count?.arquivos ?? 0}</span>
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Link to={`/obras/${o.id}/leitura`}>
                      <Button variant="outline" size="sm"><Sparkles className="h-4 w-4" /> Ler com IA</Button>
                    </Link>
                    <Link to={`/obras/${o.id}/dimensionamento`}>
                      <Button variant="outline" size="sm"><Ruler className="h-4 w-4" /> Dimensionar</Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ObraDialog open={open} saving={create.isPending} onClose={() => setOpen(false)} onSubmit={(v) => create.mutate(v)} />
    </div>
  );
}

function ObraDialog({
  open, saving, onClose, onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (vals: ObraInput) => void;
}) {
  const { data: clientesData } = useQuery({ queryKey: ['clientes', 'select'], queryFn: () => clientesApi.list({ limit: 100 }) });
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectClass = cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova obra"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="obra-form" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </>
      }
    >
      <form id="obra-form" onSubmit={handleSubmit((d) => onSubmit(d))} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="clienteId">Cliente *</Label>
          <select id="clienteId" className={selectClass} {...register('clienteId')} defaultValue="">
            <option value="" disabled>Selecione...</option>
            {(clientesData?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {errors.clienteId && <p className="text-xs text-destructive">{errors.clienteId.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="nome">Nome da obra *</Label>
          <Input id="nome" {...register('nome')} />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" {...register('cidade')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" maxLength={2} {...register('uf')} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="regiao">Região (p/ regras climáticas)</Label>
          <Input id="regiao" placeholder="ex.: NORDESTE" {...register('regiao')} />
        </div>
      </form>
    </Dialog>
  );
}
