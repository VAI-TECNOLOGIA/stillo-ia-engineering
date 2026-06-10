import { api } from './api';
import { useAuthStore } from '@/stores/auth.store';
import { isDemo } from './demo';

export type Sistema =
  | 'FILTRAGEM' | 'LED' | 'AQUECIMENTO' | 'HIDROMASSAGEM' | 'CASCATA'
  | 'BORDA_INFINITA' | 'PRAINHA' | 'SPA' | 'SAUNA' | 'TRATAMENTO';

export const SISTEMAS: Sistema[] = [
  'FILTRAGEM', 'LED', 'AQUECIMENTO', 'HIDROMASSAGEM', 'CASCATA',
  'BORDA_INFINITA', 'PRAINHA', 'SPA', 'SAUNA', 'TRATAMENTO',
];

export interface PiscinaExtraida {
  nome?: string;
  tipo?: 'INTERNA' | 'EXTERNA';
  comprimentoM?: number | null;
  larguraM?: number | null;
  profundidadeM?: number | null;
  sistemas: Sistema[];
  observacoes?: string;
  confianca: number;
}

export interface ProjetoExtraido {
  piscinas: PiscinaExtraida[];
  avisos: string[];
}

export type LeituraStatus = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHA' | 'REVISAO_MANUAL';

export interface Leitura {
  id: string;
  obraId: string;
  status: LeituraStatus;
  ocrConfianca?: number | null;
  resultado: ProjetoExtraido;
  modeloIa?: string | null;
  erro?: string | null;
  createdAt: string;
}

export interface ArquivoResumo {
  id: string;
  nomeOriginal: string;
  tipo: string;
  statusProcessamento: string;
  createdAt: string;
}

export type UploadProgressCallback = (pct: number) => void;

/** Limite acima do qual usa upload direto ao storage (bypassa funcao serverless). */
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4 MB

export const leituraApi = {
  listArquivos: (obraId: string) => api<ArquivoResumo[]>(`/obras/${obraId}/arquivos`),
  obter: (obraId: string) => api<Leitura | null>(`/obras/${obraId}/leitura`),
  disparar: (obraId: string, arquivoId?: string) =>
    api<Leitura>(`/obras/${obraId}/leitura`, { method: 'POST', body: JSON.stringify({ arquivoId }) }),
  corrigir: (leituraId: string, resultado: ProjetoExtraido) =>
    api<Leitura>(`/leituras/${leituraId}`, { method: 'PATCH', body: JSON.stringify({ resultado }) }),
  aplicar: (leituraId: string) =>
    api<{ piscinasCriadas: number }>(`/leituras/${leituraId}/aplicar`, { method: 'POST' }),

  /**
   * Upload de arquivo. Estrategia automatica:
   *  - Demo: mock instantaneo
   *  - <= 4 MB: upload via funcao serverless (FormData)
   *  - > 4 MB: upload direto browser -> storage (Vercel Blob ou Supabase)
   *
   * onProgress(pct): 0..100 durante o upload.
   */
  async upload(obraId: string, file: File, onProgress?: UploadProgressCallback): Promise<ArquivoResumo> {
    if (isDemo()) {
      onProgress?.(100);
      return { id: 'a-demo', nomeOriginal: file.name, tipo: 'PDF', statusProcessamento: 'PENDENTE', createdAt: 'agora' };
    }

    const token = useAuthStore.getState().accessToken;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // Arquivos grandes -> upload direto (bypassa limite serverless Vercel)
    if (file.size > DIRECT_UPLOAD_THRESHOLD) {
      return uploadDireto(obraId, file, authHeaders, onProgress);
    }

    // Arquivos pequenos -> via funcao serverless
    onProgress?.(0);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/v1/obras/${obraId}/arquivos`, {
      method: 'POST',
      headers: authHeaders,
      body: fd,
    });
    onProgress?.(100);
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`Falha no upload: ${res.status} ${msg}`);
    }
    return res.json() as Promise<ArquivoResumo>;
  },
};

/**
 * Upload direto browser -> Vercel Blob ou Supabase.
 *
 * Vercel Blob (provider = 'vercel-blob'):
 *   1. GET /upload-url -> { provider, uploadUrl, clientToken, storageKey }
 *   2. PUT uploadUrl com Authorization: Bearer clientToken
 *   3. Resposta do PUT: { url } -> e esse url vira o storageKey no /confirm
 *
 * Supabase (provider = 'supabase'):
 *   1. GET /upload-url -> { provider, uploadUrl, storageKey }
 *   2. PUT uploadUrl (token embutido no query string)
 *   3. storageKey ja conhecido antes do upload
 */
async function uploadDireto(
  obraId: string,
  file: File,
  authHeaders: Record<string, string>,
  onProgress?: UploadProgressCallback,
): Promise<ArquivoResumo> {
  // 1. Obter credenciais de upload do backend
  const params = new URLSearchParams({ nome: file.name });
  const urlRes = await fetch(`/api/v1/obras/${obraId}/arquivos/upload-url?${params}`, {
    headers: authHeaders,
  });
  if (!urlRes.ok) {
    const msg = await urlRes.text().catch(() => '');
    throw new Error(`Falha ao obter URL de upload: ${urlRes.status} ${msg}`);
  }
  const creds = (await urlRes.json()) as {
    provider: 'vercel-blob' | 'supabase';
    uploadUrl: string;
    clientToken?: string;
    storageKey: string;
  };

  // 2. PUT direto para o storage (com progresso via XHR)
  const finalStorageKey = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', creds.uploadUrl);
    // Vercel Blob: token embutido na uploadUrl (sem header de auth necessario)
    // Supabase: token embutido na uploadUrl (query string)
    // Ambos aceitam Content-Type direto
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 90)); // 0->90%
    };

    xhr.onload = () => {
      if (xhr.status >= 300) {
        reject(new Error(`Storage PUT ${xhr.status}: ${xhr.responseText}`));
        return;
      }
      // Vercel Blob retorna { url } na resposta; Supabase nao retorna body util
      if (creds.provider === 'vercel-blob') {
        try {
          const { url } = JSON.parse(xhr.responseText) as { url: string };
          resolve(url); // URL final e o storageKey para o Vercel Blob
        } catch {
          reject(new Error('Resposta inesperada do Vercel Blob'));
        }
      } else {
        resolve(creds.storageKey); // Supabase: usa o path original
      }
    };
    xhr.onerror = () => reject(new Error('Falha de rede no upload direto'));
    xhr.send(file);
  });

  // 3. Confirmar no backend (cria registro no banco)
  const confirmRes = await fetch(`/api/v1/obras/${obraId}/arquivos/confirm`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storageKey: finalStorageKey,
      nomeOriginal: file.name,
      mimeType: file.type || 'application/octet-stream',
      tamanhoBytes: file.size,
    }),
  });
  if (!confirmRes.ok) {
    const msg = await confirmRes.text().catch(() => '');
    throw new Error(`Falha ao confirmar upload: ${confirmRes.status} ${msg}`);
  }
  onProgress?.(100);
  return confirmRes.json() as Promise<ArquivoResumo>;
}
