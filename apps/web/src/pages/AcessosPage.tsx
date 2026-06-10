import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, RefreshCw, LogIn, FilePlus, FileEdit,
  Trash2, CheckCircle, Upload, HelpCircle, Filter,
} from 'lucide-react';
import { auditApi, type AuditLog } from '@/lib/audit.api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── helpers ───────────────────────────────────────────────────────────────────

const ACAO_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  LOGIN:   { label: 'Login',     color: 'bg-sky-100 text-sky-700',              icon: LogIn },
  CREATE:  { label: 'Criação',   color: 'bg-emerald-100 text-emerald-700',       icon: FilePlus },
  UPDATE:  { label: 'Edição',    color: 'bg-amber-100 text-amber-700',           icon: FileEdit },
  DELETE:  { label: 'Exclusão',  color: 'bg-destructive/10 text-destructive',    icon: Trash2 },
  APPROVE: { label: 'Aprovação', color: 'bg-violet-100 text-violet-700',         icon: CheckCircle },
  EXPORT:  { label: 'Export',    color: 'bg-indigo-100 text-indigo-700',         icon: Upload },
};

const ROLE_CLS: Record<string, string> = {
  ADMIN:        'bg-rose-100 text-rose-700',
  DIRETORIA:    'bg-violet-100 text-violet-700',
  GERENTE:      'bg-sky-100 text-sky-700',
  ORCAMENTISTA: 'bg-emerald-100 text-emerald-700',
  COMERCIAL:    'bg-amber-100 text-amber-700',
  CONSULTA:     'bg-muted text-muted-foreground',
};

// Grupos de filtro
type FiltroGroup = 'todos' | 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT';

const FILTROS: { key: FiltroGroup; label: string }[] = [
  { key: 'todos',   label: 'Todos' },
  { key: 'LOGIN',   label: 'Logins' },
  { key: 'CREATE',  label: 'Criações' },
  { key: 'UPDATE',  label: 'Edições' },
  { key: 'APPROVE', label: 'Aprovações' },
  { key: 'DELETE',  label: 'Exclusões' },
  { key: 'EXPORT',  label: 'Exports' },
];

function formatTs(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const diffMin = Math.round((hoje.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1)  return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffMin < 1440) {
    const h = Math.round(diffMin / 60);
    return `há ${h}h`;
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function parseDevice(ua?: string | null): string {
  if (!ua) return '—';
  if (/iPhone/.test(ua))     return '📱 iPhone';
  if (/Android/.test(ua))    return '📱 Android';
  if (/Macintosh/.test(ua))  return '💻 Mac';
  if (/Windows/.test(ua))    return '🖥️ Windows';
  if (/Linux/.test(ua))      return '🐧 Linux';
  return '🌐 Navegador';
}

function AcaoChip({ acao }: { acao: string }) {
  const meta = ACAO_META[acao] ?? { label: acao, color: 'bg-muted text-muted-foreground', icon: HelpCircle };
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ── componente principal ──────────────────────────────────────────────────────

export function AcessosPage() {
  const [filtro, setFiltro] = useState<FiltroGroup>('todos');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => auditApi.recent(100),
    refetchInterval: 30_000,
  });

  const logs: AuditLog[] = data ?? [];

  // Contagem por ação para os badges dos filtros
  const contagem: Partial<Record<FiltroGroup, number>> = { todos: logs.length };
  for (const l of logs) {
    const k = l.acao as FiltroGroup;
    contagem[k] = (contagem[k] ?? 0) + 1;
  }

  // Logs filtrados
  const logsVisiveis = filtro === 'todos' ? logs : logs.filter((l) => l.acao === filtro);

  // Agrupa logins únicos por usuário para o resumo
  const loginMap: Record<string, { nome: string; email: string; role: string; ultimoAcesso: string; total: number }> = {};
  for (const l of logs) {
    if (!l.autor) continue;
    const key = l.autor.id;
    if (!loginMap[key]) {
      loginMap[key] = { nome: l.autor.nome, email: l.autor.email, role: l.autor.role, ultimoAcesso: l.createdAt, total: 0 };
    }
    loginMap[key].total++;
    if (l.createdAt > loginMap[key].ultimoAcesso) loginMap[key].ultimoAcesso = l.createdAt;
  }
  const usuarios = Object.values(loginMap).sort((a, b) => b.ultimoAcesso.localeCompare(a.ultimoAcesso));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" /> Acessos e Auditoria
          </h1>
          <p className="text-sm text-muted-foreground">
            Trilha de sessões e ações — últimos 100 registros · atualiza a cada 30s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Cards resumo de usuários — skeleton ou dados */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      ) : usuarios.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {usuarios.slice(0, 4).map((u) => (
            <Card key={u.email} className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {u.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={cn('rounded-full px-1.5 py-0 text-[10px] font-medium', ROLE_CLS[u.role] ?? 'bg-muted text-muted-foreground')}>{u.role}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTs(u.ultimoAcesso)}</span>
                  <span className="text-[10px] text-muted-foreground">· {u.total} ações</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs de filtro */}
      <div className="flex items-center gap-1 overflow-x-auto border-b pb-0">
        <Filter className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
        {FILTROS.map((f) => {
          const count = contagem[f.key] ?? 0;
          if (f.key !== 'todos' && count === 0) return null;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors',
                filtro === f.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                filtro === f.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabela de log */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            {filtro === 'todos' ? `Todas as ações` : FILTROS.find((f) => f.key === filtro)?.label}
            {' '}· {logsVisiveis.length} registro{logsVisiveis.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : logsVisiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filtro === 'todos'
                ? 'Nenhum registro ainda. Os acessos aparecerão aqui a partir do próximo login.'
                : `Sem registros de "${FILTROS.find((f) => f.key === filtro)?.label}" ainda.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Horário</th>
                  <th className="p-3 font-medium">Usuário</th>
                  <th className="p-3 font-medium">Ação</th>
                  <th className="p-3 font-medium">Entidade</th>
                  <th className="p-3 font-medium">IP</th>
                  <th className="p-3 font-medium">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {logsVisiveis.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatTs(l.createdAt)}</td>
                    <td className="p-3">
                      {l.autor ? (
                        <div>
                          <span className="font-medium">{l.autor.nome}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn('rounded-full px-1.5 text-[10px] font-medium', ROLE_CLS[l.autor.role] ?? 'bg-muted text-muted-foreground')}>
                              {l.autor.role}
                            </span>
                            <span className="text-xs text-muted-foreground">{l.autor.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <AcaoChip acao={l.acao} />
                    </td>
                    <td className="p-3 text-xs">
                      <span className="font-medium">{l.entidade}</span>
                      {l.entidadeId && <span className="ml-1 font-mono text-muted-foreground">#{l.entidadeId.slice(-6)}</span>}
                    </td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">{l.ip ?? '—'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{parseDevice(l.userAgent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
