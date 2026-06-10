import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoHidraulicaSchema, type ExtracaoHidraulica } from '../extraction.schemas';

const EVID = `{"valor": number|string|boolean|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

@Injectable()
export class HydraulicExtractor extends BaseDisciplineExtractor<ExtracaoHidraulica> {
  protected readonly logger = new Logger(HydraulicExtractor.name);
  readonly disciplina = 'HIDRAULICO';
  protected readonly schema = ExtracaoHidraulicaSchema;

  protected readonly promptDisciplina = `Você é um engenheiro hidráulico sênior especialista em projetos hidráulicos de piscinas.

VOCÊ SÓ PODE EXTRAIR (escopo HIDRÁULICO):
• Bombas: descrição, potência (cv), vazão (m³/h), quantidade — APENAS o que está escrito
• Filtros: descrição, diâmetro (mm), quantidade
• Tubulações: função (sucção/retorno/aspiração/dreno/hidromassagem/extravasor), diâmetro (DN/Ø como escrito), material (PVC, CPVC)
• Dispositivos: skimmer, dreno de fundo, dispositivo de retorno, boca de aspiração, calha de borda — com quantidades escritas
• Aquecimento: presença, tipo (trocador, bomba de calor, solar) e potência ESCRITAS no projeto hidráulico

VOCÊ NUNCA PODE EXTRAIR (fora da sua disciplina — IGNORE mesmo que apareça):
✗ Área, comprimento, largura ou formato de piscina (disciplina ARQUITETÔNICA)
✗ Profundidades (disciplina CORTES)
✗ NUNCA invente área da piscina — você não tem autoridade sobre geometria
✗ Circuitos elétricos, refletores (disciplina ELÉTRICA)
✗ Estrutura, concreto (disciplina ESTRUTURAL)

ATENÇÃO CRÍTICA:
- Se a potência da bomba não estiver escrita, devolva potenciaCv com valor null — NÃO deduza pela vazão.
- Se o diâmetro da tubulação aparece no desenho mas o texto OCR não o capturou, status NAO_IDENTIFICADO.
- Quantidades: conte APENAS itens listados textualmente (tabelas, legendas, notas).

Responda APENAS JSON válido neste formato:
{
  "disciplina": "HIDRAULICO",
  "bombas": [{"descricao": ${EVID}, "potenciaCv": ${EVID}, "vazaoM3h": ${EVID}, "quantidade": ${EVID}}],
  "filtros": [{"descricao": ${EVID}, "diametroMm": ${EVID}, "quantidade": ${EVID}}],
  "tubulacoes": [{"funcao": "SUCCAO"|"RETORNO"|"ASPIRACAO"|"DRENO"|"HIDROMASSAGEM"|"EXTRAVASOR"|"OUTRO", "diametro": ${EVID}, "material": ${EVID}}],
  "dispositivos": [{"tipo": "SKIMMER"|"DRENO_FUNDO"|"DISPOSITIVO_RETORNO"|"BOCA_ASPIRACAO"|"BORDA_CALHA"|"OUTRO", "quantidade": ${EVID}}],
  "aquecimento": {"existe": ${EVID}, "tipo": ${EVID}, "potencia": ${EVID}},
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
