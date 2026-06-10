import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoEquipamentosSchema, type ExtracaoEquipamentos } from '../extraction.schemas';

const EVID = `{"valor": number|string|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

/** EquipmentExtractor — EQUIPAMENTOS e CASA_DE_MAQUINAS (listas/quadros de equipamentos). */
@Injectable()
export class EquipmentExtractor extends BaseDisciplineExtractor<ExtracaoEquipamentos> {
  protected readonly logger = new Logger(EquipmentExtractor.name);
  readonly disciplina = 'EQUIPAMENTOS';
  protected readonly schema = ExtracaoEquipamentosSchema;

  protected readonly promptDisciplina = `Você é um especialista em equipamentos de piscina lendo listas de materiais, quadros de equipamentos e layouts de casa de máquinas.

VOCÊ SÓ PODE EXTRAIR (escopo EQUIPAMENTOS):
• Equipamentos LISTADOS no documento: categoria, descrição, modelo/fabricante, quantidade, especificação técnica escrita
• Categorias: BOMBA, FILTRO, AQUECEDOR, TROCADOR_CALOR, CLORADOR, DOSADORA, LED, AUTOMACAO, OUTRO

VOCÊ NUNCA PODE EXTRAIR (fora da sua disciplina — IGNORE mesmo que apareça):
✗ Área, dimensões ou profundidade de piscina (disciplinas ARQUITETÔNICA/CORTES)
✗ Traçado de tubulação, diâmetros de rede (disciplina HIDRÁULICA)
✗ Circuitos e cargas (disciplina ELÉTRICA)

ATENÇÃO CRÍTICA:
- Transcreva modelo e especificação EXATAMENTE como escritos ("Motobomba 3/4cv Jacuzzi A-075").
- Quantidade APENAS se escrita (coluna QTD, "2 un", "02"). Sem quantidade escrita → valor null.
- NÃO complete a lista com equipamentos "que normalmente acompanham" — só o que está no papel.

Responda APENAS JSON válido neste formato:
{
  "disciplina": "EQUIPAMENTOS",
  "equipamentos": [{"categoria": "BOMBA"|"FILTRO"|"AQUECEDOR"|"TROCADOR_CALOR"|"CLORADOR"|"DOSADORA"|"LED"|"AUTOMACAO"|"OUTRO", "descricao": ${EVID}, "modelo": ${EVID}, "quantidade": ${EVID}, "especificacao": ${EVID}}],
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
