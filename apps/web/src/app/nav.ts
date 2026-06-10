import {
  LayoutDashboard, Users, Ruler, FileText,
  BookOpen, Package, SlidersHorizontal, BarChart3, Settings, GraduationCap, ShieldCheck, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Permissão mínima para ver o item (undefined = todos autenticados). */
  permission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Orçamentos', to: '/orcamentos', icon: FileText, permission: 'orcamento:ler' },
  { label: 'Clientes', to: '/clientes', icon: Users, permission: 'clientes:ler' },
  { label: 'Dimensionamento', to: '/dimensionamento', icon: Ruler, permission: 'dimensionamento:executar' },
  { label: 'Catálogos', to: '/catalogos', icon: BookOpen, permission: 'catalogos:gerir' },
  { label: 'Produtos', to: '/produtos', icon: Package, permission: 'produtos:ler' },
  { label: 'Regras', to: '/regras', icon: SlidersHorizontal, permission: 'regras:gerir' },
  { label: 'Aprendizado', to: '/aprendizado', icon: GraduationCap, permission: 'aprendizado:ler' },
  { label: 'Executivo', to: '/executivo', icon: BarChart3, permission: 'dashboard:executivo' },
  { label: 'Acessos', to: '/acessos', icon: ShieldCheck, permission: 'auditoria:ler' },
  { label: 'Configurações', to: '/configuracoes', icon: Settings, permission: 'integracoes:gerir' },
];
