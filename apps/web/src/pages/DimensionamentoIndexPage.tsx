import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ruler, ChevronRight, Loader2 } from 'lucide-react';
import { obrasApi } from '@/lib/obras.api';
import { Card } from '@/components/ui/card';

export function DimensionamentoIndexPage() {
  const { data, isLoading } = useQuery({ queryKey: ['obras'], queryFn: () => obrasApi.list({ limit: 50 }) });
  const obras = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Ruler className="h-6 w-6 text-primary" /> Dimensionamento
        </h1>
        <p className="text-muted-foreground">Escolha uma obra para gerar o dimensionamento técnico.</p>
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {isLoading && <li className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></li>}
          {!isLoading && obras.length === 0 && <li className="p-8 text-center text-muted-foreground">Nenhuma obra. Crie uma em Obras.</li>}
          {obras.map((o) => (
            <li key={o.id}>
              <Link to={`/obras/${o.id}/dimensionamento`} className="flex items-center justify-between p-4 hover:bg-muted/30">
                <div>
                  <div className="font-medium">{o.nome}</div>
                  <div className="text-sm text-muted-foreground">{o.cliente?.nome} · {o._count?.piscinas ?? 0} piscina(s)</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
