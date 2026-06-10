import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoMemorialSchema, type ExtracaoMemorial } from '../extraction.schemas';

const EVID = `{"valor": number|string|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

/**
 * MemorialExtractor — MEMORIAL_DESCRITIVO.
 * Memoriais citam áreas, volumes e profundidades POR ESCRITO — evidência textual válida.
 */
@Injectable()
export class MemorialExtractor extends BaseDisciplineExtractor<ExtracaoMemorial> {
  protected readonly logger = new Logger(MemorialExtractor.name);
  readonly disciplina = 'MEMORIAL_DESCRITIVO';
  protected readonly schema = ExtracaoMemorialSchema;

  protected readonly promptDisciplina = `Você é um engenheiro especialista em memoriais descritivos e especificações técnicas de projetos de piscina.

VOCÊ SÓ PODE EXTRAIR (escopo MEMORIAL):
• Corpos d'água citados no texto com seus dados ESCRITOS: área (m²), volume (m³), profundidade (m)
  - APENAS números que aparecem literalmente no texto do memorial
• Sistemas especificados por escrito: filtragem, iluminação, aquecimento, tratamento, hidromassagem, cascata, borda infinita
• Especificações técnicas de materiais e acabamentos

VOCÊ NUNCA PODE EXTRAIR:
✗ Volume calculado por você (área × profundidade é PROIBIDO) — só volume ESCRITO
✗ Dados de pranchas desenhadas que não estejam transcritos neste memorial

ATENÇÃO CRÍTICA:
- Memorial é fonte AUTORITATIVA quando cita números por escrito ("piscina adulto com 41,40m² e volume de 58m³").
- Indique a fonte como "MEMORIAL item X.Y" ou "MEMORIAL p.N" quando identificável.

Responda APENAS JSON válido neste formato:
{
  "disciplina": "MEMORIAL_DESCRITIVO",
  "corposDagua": [{"nome": string, "tipoCorpo": "PISCINA_ADULTO"|"PISCINA_INFANTIL"|"SPA"|"PRAINHA"|"ESPELHO_DAGUA"|"DESCONHECIDO", "areaM2": ${EVID}, "volumeM3": ${EVID}, "profundidadeM": ${EVID}}],
  "sistemas": [{"sistema": string, "descricao": ${EVID}}],
  "especificacoes": [{"item": string, "descricao": string, "fonte": string, "pagina": number|null}],
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
