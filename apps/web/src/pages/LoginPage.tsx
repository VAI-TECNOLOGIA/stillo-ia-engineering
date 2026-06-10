import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Waves } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';
import { isDemo } from '@/lib/demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [erro, setErro] = useState<string | null>(null);

  const demoDefaults = isDemo() ? { email: 'admin@stillo.com', senha: 'stillo123' } : undefined;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: demoDefaults,
  });

  async function onSubmit(data: FormData) {
    setErro(null);
    try {
      const res = await api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      // carrega permissões via /auth/me
      useAuthStore.getState().setSession(res);
      const me = await api<AuthUser>('/auth/me');
      setSession({ ...res, user: me });
      navigate('/dashboard');
    } catch {
      setErro('Credenciais inválidas. Verifique e tente novamente.');
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-accent to-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Waves className="h-7 w-7" />
          </div>
          <CardTitle>STILLO IA Engineering</CardTitle>
          <CardDescription>Orçamentos técnicos de piscina com IA</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">E-mail</label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="senha">Senha</label>
              <Input id="senha" type="password" {...register('senha')} />
              {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
            {isDemo() && (
              <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                ⚙️ Demo · <span className="font-mono">admin@stillo.com</span> / <span className="font-mono">stillo123</span>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
