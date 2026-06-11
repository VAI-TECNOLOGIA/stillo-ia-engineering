import { Logger } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';
import { AiService } from '../../ai/ai.service';
import type { ChatContentPart, ChatMessage, ProviderNome } from '../../ai/ai.types';
import { limparJson } from '../evidence.schema';

/**
 * ETAPA 2 — EXTRAÇÃO ESPECIALIZADA.
 * Base de todo extrator de disciplina. Cada subclasse define:
 *  - escopo PERMITIDO (o que extrair)
 *  - escopo PROIBIDO (o que IGNORAR mesmo que apareça no documento)
 *  - schema Zod com evidência obrigatória
 *
 * O bloco anti-inferência é GLOBAL e inegociável — entra em todo prompt.
 */

export const REGRAS_ANTI_INFERENCIA = `
REGRAS GLOBAIS ANTI-INFERÊNCIA (INEGOCIÁVEIS):
❌ PROIBIDO estimar qualquer valor.
❌ PROIBIDO inferir por contexto, semelhança ou "experiência".
❌ PROIBIDO arredondar valores (transcreva exatamente como está escrito).
❌ PROIBIDO calcular visualmente ou derivar medidas (ex.: área a partir de lados).
❌ PROIBIDO usar escala do desenho para calcular dimensões.
❌ PROIBIDO assumir profundidade padrão, equipamento padrão ou sistema padrão.
❌ PROIBIDO assumir volumes — volume só existe se estiver ESCRITO no documento.
✅ Quando um dado NÃO estiver escrito explicitamente no texto, devolva:
   { "valor": null, "fonte": null, "pagina": null, "status": "NAO_IDENTIFICADO" }

SISTEMA DE EVIDÊNCIAS (OBRIGATÓRIO):
Todo valor extraído DEVE vir acompanhado de:
- "fonte": de onde veio (ex.: "PLANTA BAIXA - LAZER", "CORTE AA", "CARIMBO", "TABELA DE EQUIPAMENTOS", "MEMORIAL item 4.2")
- "pagina": número da página onde está a informação (ou null se não identificável)
- "status": "CONFIRMADO" (valor lido do documento) ou "NAO_IDENTIFICADO" (valor null)
Um valor sem fonte é INVÁLIDO e será rejeitado pelo sistema.

RUÍDO DE OCR: interprete grafias equivalentes (1,40m = 1.40m = l,40m; Ø = O = DN) — isso NÃO é inferência, é leitura.
`;

export interface ResultadoExtracao<T> {
  extracao: T | null;
  erro?: string;
}

export abstract class BaseDisciplineExtractor<T> {
  protected abstract readonly logger: Logger;
  /** Nome legível da disciplina (para logs/auditoria). */
  abstract readonly disciplina: string;
  /** Prompt de sistema ESPECÍFICO da disciplina (escopo permitido/proibido + shape JSON). */
  protected abstract readonly promptDisciplina: string;
  /** Schema Zod que valida a extração (evidência obrigatória). Input ≠ output por causa dos defaults. */
  protected abstract readonly schema: ZodType<T, ZodTypeDef, unknown>;

  constructor(protected readonly ai: AiService) {}

  /**
   * Extrai dados da disciplina. Dois canais de leitura:
   *  - texto: conteúdo extraído por página ([pág N]) — PDFs com texto nativo
   *  - imagens: páginas rasterizadas (data URLs) — GPT-4o Vision LÊ A PRANCHA
   *    (cotas posicionadas, carimbo, geometria — o que o texto nunca captura)
   * Com imagens, o texto vira contexto complementar.
   */
  async extrair(tenantId: string, texto: string, imagens: string[] = [], provider?: ProviderNome): Promise<ResultadoExtracao<T>> {
    const temTexto = !!texto && texto.trim().length >= 20;
    if (!temTexto && imagens.length === 0) {
      return { extracao: null, erro: 'Documento sem texto legível e sem páginas rasterizadas — leitura impossível.' };
    }

    const system = `${this.promptDisciplina}\n${REGRAS_ANTI_INFERENCIA}`;
    const messages: ChatMessage[] = [{ role: 'system', content: system }];

    if (imagens.length > 0) {
      const partes: ChatContentPart[] = [
        {
          type: 'text',
          text:
            `Analise as ${imagens.length} página(s) da prancha em imagem (página 1 = primeira imagem). ` +
            `Use a numeração da imagem como "pagina" na evidência.` +
            (temTexto ? `\n\nTexto extraído do PDF como apoio (pode estar incompleto):\n"""\n${texto.slice(0, 6000)}\n"""` : ''),
        },
        ...imagens.map((url): ChatContentPart => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
      ];
      messages.push({ role: 'user', content: partes });
    } else {
      messages.push({
        role: 'user',
        content: `Texto extraído do documento (pode conter ruído de OCR; marcadores [pág N] indicam páginas):\n"""\n${texto.slice(0, 14000)}\n"""`,
      });
    }

    try {
      // provider explícito → consenso multi-IA; senão → provider default (openai)
      const res = provider
        ? await this.ai.completeWith(tenantId, provider, messages, { jsonMode: true, temperature: 0 })
        : await this.ai.complete(tenantId, messages, { jsonMode: true, temperature: 0 });
      const parsed = this.schema.parse(limparJson(res.content));
      return { extracao: parsed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Extração ${this.disciplina} falhou: ${msg}`);
      return { extracao: null, erro: `Extração ${this.disciplina} inválida: ${msg.slice(0, 500)}` };
    }
  }
}
