import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { iaApi, type Fonte } from '@/lib/ia.api';

interface Msg {
  papel: 'user' | 'assistant';
  texto: string;
  fontes?: Fonte[];
}

/**
 * Chat técnico (RAG). Conecta ao POST /ia/chat — respostas usam o catálogo real
 * e citam o SKU. Requer OpenAI vinculada em Configurações.
 */
export function AiChatPanel() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { papel: 'assistant', texto: 'Olá! Pergunte algo técnico, ex.: "Qual bomba para 80m³?". Respondo com produtos reais do catálogo.' },
  ]);
  const [input, setInput] = useState('');
  const [conversaId, setConversaId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function send() {
    const pergunta = input.trim();
    if (!pergunta || loading) return;
    setInput('');
    setMsgs((m) => [...m, { papel: 'user', texto: pergunta }]);
    setLoading(true);
    try {
      const r = await iaApi.chat(pergunta, conversaId);
      setConversaId(r.conversaId);
      setMsgs((m) => [...m, { papel: 'assistant', texto: r.resposta, fontes: r.fontes }]);
    } catch {
      setMsgs((m) => [...m, { papel: 'assistant', texto: 'Não consegui responder. Vincule a OpenAI em Configurações e cadastre produtos.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.papel === 'user' ? 'text-right' : 'text-left'}>
            <div className={m.papel === 'user' ? 'inline-block rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground' : 'inline-block rounded-lg bg-muted px-3 py-2 text-sm'}>
              <span className="whitespace-pre-wrap">{m.texto}</span>
              {m.fontes && m.fontes.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">📎 {m.fontes.map((f) => f.sku).join(', ')}</div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-left"><span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> consultando catálogo...</span></div>}
      </div>
      <div className="flex items-center gap-2 border-t p-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Pergunte algo..." disabled={loading} />
        <Button size="icon" onClick={send} disabled={loading} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
