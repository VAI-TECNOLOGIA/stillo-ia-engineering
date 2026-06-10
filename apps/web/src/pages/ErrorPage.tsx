import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Waves, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Tela amigável para rotas inexistentes (404) ou erros de roteamento. */
export function ErrorPage() {
  const error = useRouteError();
  // Catch-all "*" renderiza sem erro de rota → tratamos como 404.
  const is404 = !error || (isRouteErrorResponse(error) && error.status === 404);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-accent to-background p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Waves className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">{is404 ? '404' : 'Ops!'}</h1>
        <p className="mt-1 text-muted-foreground">
          {is404 ? 'A página que você procura não existe.' : 'Algo deu errado ao carregar esta página.'}
        </p>
      </div>
      <Link to="/"><Button><Home className="h-4 w-4" /> Voltar ao início</Button></Link>
    </div>
  );
}
