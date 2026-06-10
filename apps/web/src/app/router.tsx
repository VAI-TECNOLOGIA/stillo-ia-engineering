import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RegrasPage } from '@/pages/RegrasPage';
import { ClientesPage } from '@/pages/ClientesPage';
import { ObrasPage } from '@/pages/ObrasPage';
import { LeituraPage } from '@/pages/LeituraPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { DimensionamentoPage } from '@/pages/DimensionamentoPage';
import { DimensionamentoIndexPage } from '@/pages/DimensionamentoIndexPage';
import { ProdutosPage } from '@/pages/ProdutosPage';
import { CatalogosPage } from '@/pages/CatalogosPage';
import { OrcamentosIndexPage } from '@/pages/OrcamentosIndexPage';
import { OrcamentoPage } from '@/pages/OrcamentoPage';
import { NovoOrcamentoPage } from '@/pages/NovoOrcamentoPage';
import { AprendizadoPage } from '@/pages/AprendizadoPage';
import { ExecutivoPage } from '@/pages/ExecutivoPage';
import { AcessosPage } from '@/pages/AcessosPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        errorElement: <ErrorPage />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/clientes', element: <ClientesPage /> },
          { path: '/obras', element: <ObrasPage /> },
          { path: '/obras/:obraId/leitura', element: <LeituraPage /> },
          { path: '/obras/:obraId/dimensionamento', element: <DimensionamentoPage /> },
          { path: '/configuracoes', element: <ConfiguracoesPage /> },
          { path: '/piscinas', element: <PlaceholderPage titulo="Piscinas" fase="Fase 2" /> },
          { path: '/dimensionamento', element: <DimensionamentoIndexPage /> },
          { path: '/orcamentos', element: <OrcamentosIndexPage /> },
          { path: '/orcamentos/novo', element: <NovoOrcamentoPage /> },
          { path: '/orcamentos/:id', element: <OrcamentoPage /> },
          { path: '/catalogos', element: <CatalogosPage /> },
          { path: '/produtos', element: <ProdutosPage /> },
          { path: '/regras', element: <RegrasPage /> },
          { path: '/aprendizado', element: <AprendizadoPage /> },
          { path: '/executivo', element: <ExecutivoPage /> },
          { path: '/acessos', element: <AcessosPage /> },
          { path: '*', element: <ErrorPage /> },
        ],
      },
    ],
  },
]);
