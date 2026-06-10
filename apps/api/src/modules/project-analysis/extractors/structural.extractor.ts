import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoEstruturalSchema, type ExtracaoEstrutural } from '../extraction.schemas';

const EVID = `{"valor": number|string|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

@Injectable()
export class StructuralExtractor extends BaseDisciplineExtractor<ExtracaoEstrutural> {
  protected readonly logger = new Logger(StructuralExtractor.name);
  readonly disciplina = 'ESTRUTURAL';
  protected readonly schema = ExtracaoEstruturalSchema;

  protected readonly promptDisciplina = `Você é um engenheiro estrutural sênior especialista em estruturas de piscinas (concreto armado, alvenaria estrutural, vinil).

VOCÊ SÓ PODE EXTRAIR (escopo ESTRUTURAL):
• Elementos estruturais descritos: laje de fundo, paredes, vigas de borda — com especificação escrita
• Resistência do concreto (fck) quando especificada
• Sistema de impermeabilização especificado

VOCÊ NUNCA PODE EXTRAIR (fora da sua disciplina — IGNORE mesmo que apareça):
✗ Área ou formato da piscina (disciplina ARQUITETÔNICA)
✗ Profundidades como dado de projeto (disciplina CORTES)
✗ Bombas, filtros, equipamentos (disciplinas HIDRÁULICA/EQUIPAMENTOS)

Responda APENAS JSON válido neste formato:
{
  "disciplina": "ESTRUTURAL",
  "elementos": [{"tipo": ${EVID}, "especificacao": ${EVID}}],
  "concretoFck": ${EVID},
  "impermeabilizacao": ${EVID},
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
