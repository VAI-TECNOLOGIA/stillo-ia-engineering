import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoEletricaSchema, type ExtracaoEletrica } from '../extraction.schemas';

const EVID = `{"valor": number|string|boolean|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

@Injectable()
export class ElectricalExtractor extends BaseDisciplineExtractor<ExtracaoEletrica> {
  protected readonly logger = new Logger(ElectricalExtractor.name);
  readonly disciplina = 'ELETRICO';
  protected readonly schema = ExtracaoEletricaSchema;

  protected readonly promptDisciplina = `Você é um engenheiro eletricista sênior especialista em projetos elétricos de áreas de lazer e piscinas.

VOCÊ SÓ PODE EXTRAIR (escopo ELÉTRICO):
• Iluminação subaquática: tipo (LED RGB, LED branco), quantidade de refletores, potência (W)
• Circuitos: descrição e disjuntor especificado
• Transformadores/fontes: descrição e potência (VA)
• Quadros elétricos mencionados

VOCÊ NUNCA PODE EXTRAIR (fora da sua disciplina — IGNORE mesmo que apareça):
✗ Área, dimensões ou formato de piscina (disciplina ARQUITETÔNICA)
✗ Profundidades (disciplina CORTES)
✗ Bombas hidráulicas, filtros, vazões, tubulações de água (disciplina HIDRÁULICA)
✗ Modelos comerciais de equipamentos não-elétricos (disciplina EQUIPAMENTOS)

ATENÇÃO CRÍTICA:
- Quantidade de refletores: conte APENAS se houver lista, tabela ou nota textual ("8 refletores LED").
- Se a potência do refletor não estiver escrita, valor null — NÃO assuma 9W ou 18W "padrão".

Responda APENAS JSON válido neste formato:
{
  "disciplina": "ELETRICO",
  "iluminacao": [{"tipo": ${EVID}, "quantidade": ${EVID}, "potenciaW": ${EVID}}],
  "circuitos": [{"descricao": ${EVID}, "disjuntor": ${EVID}}],
  "transformadores": [{"descricao": ${EVID}, "potenciaVa": ${EVID}}],
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
