import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/** Página-stub para módulos das próximas fases do roadmap. */
export function PlaceholderPage({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Módulo <strong>{titulo}</strong> previsto para a <strong>{fase}</strong> do roadmap.
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            A arquitetura, o contrato de API e o modelo de dados já contemplam este módulo —
            ver <code>docs/07-ROADMAP.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
