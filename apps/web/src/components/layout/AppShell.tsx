import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, Bot, LogOut, Waves, X } from 'lucide-react';
import { NAV_ITEMS } from '@/app/nav';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AiChatPanel } from './AiChatPanel';
import { DemoBanner } from './DemoBanner';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { user, clear, hasPermission } = useAuthStore();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((i) => !i.permission || hasPermission(i.permission) || user?.role === 'ADMIN');

  function handleLogout() {
    clear();
    navigate('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <DemoBanner />
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn('flex flex-col border-r bg-card transition-all', collapsed ? 'w-16' : 'w-64')}>
        <Link to="/" className="flex h-16 items-center gap-2 border-b px-4 hover:bg-accent/40" title="Voltar ao site">
          <Waves className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && <span className="font-semibold tracking-tight">STILLO IA</span>}
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((v) => !v)} aria-label="Alternar menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setChatOpen((v) => !v)}>
              <Bot className="h-4 w-4" /> IA Técnica
            </Button>
            <div className="ml-2 text-right">
              <div className="text-sm font-medium">{user?.nome}</div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>

          {/* Painel IA lateral (toggle) */}
          {chatOpen && (
            <div className="flex w-80 flex-col border-l bg-card">
              <div className="flex h-12 items-center justify-between border-b px-4">
                <span className="flex items-center gap-2 text-sm font-medium"><Bot className="h-4 w-4 text-primary" /> IA Técnica</span>
                <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)} aria-label="Fechar chat">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <AiChatPanel />
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
