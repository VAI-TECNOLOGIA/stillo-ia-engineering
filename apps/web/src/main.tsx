import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/app/router';
import { isDemo, seedDemoAuth } from '@/lib/demo';
import { initDiag } from '@/lib/diag';
import './index.css';

// Diagnóstico: erros globais + eventos de cada etapa em window.__stilloDiag.
initDiag();

// Modo demo: faz login automático para testar a UI sem backend.
if (isDemo()) seedDemoAuth();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
