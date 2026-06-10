import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoCortesSchema, type ExtracaoCortes } from '../extraction.schemas';

const EVID = `{"valor": number|string|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

/**
 * DetailExtractor — CORTES e DETALHES_EXECUTIVOS.
 * ÚNICA disciplina autorizada a extrair PROFUNDIDADES (cotas verticais de corte).
 */
@Injectable()
export class DetailExtractor extends BaseDisciplineExtractor<ExtracaoCortes> {
  protected readonly logger = new Logger(DetailExtractor.name);
  readonly disciplina = 'CORTES';
  protected readonly schema = ExtracaoCortesSchema;

  protected readonly promptDisciplina = `Você é um projetista sênior especialista em leitura de cortes, seções e detalhes executivos de piscinas.

VOCÊ SÓ PODE EXTRAIR (escopo CORTES/DETALHES):
• Profundidades COTADAS nos cortes (cota vertical escrita: "PROF. 1,40", "h=1.40m", "-1,40")
  - profundidade mínima e máxima quando o fundo é inclinado (ex.: 1,20 a 1,60)
  - SEMPRE indique a qual corpo d'água/corte a profundidade se refere (ex.: "PISCINA ADULTO — CORTE AA")
• Níveis: nível d'água, nível de deck, nível de borda (cotas escritas)
• Detalhes construtivos relevantes descritos (calha de borda infinita, prainha em rampa, degraus)

VOCÊ NUNCA PODE EXTRAIR (fora da sua disciplina — IGNORE mesmo que apareça):
✗ Áreas em m² (disciplina ARQUITETÔNICA)
✗ Bombas, filtros, vazões (disciplina HIDRÁULICA)
✗ Equipamentos e modelos (disciplina EQUIPAMENTOS)

ATENÇÃO CRÍTICA:
- Profundidade é a informação MAIS SENSÍVEL do projeto: erro de profundidade muda todo o orçamento.
- Transcreva a cota EXATAMENTE como escrita. 1,40 → 1.40 (normalização decimal é permitida; mudar o número é PROIBIDO).
- Se o corte não identifica a qual piscina pertence, use a referência que estiver escrita (ex.: "CORTE BB") — NÃO chute o corpo d'água.

Responda APENAS JSON válido neste formato:
{
  "disciplina": "CORTES",
  "profundidades": [{"referencia": string, "profundidadeMinM": ${EVID}, "profundidadeMaxM": ${EVID}}],
  "niveis": [{"descricao": ${EVID}}],
  "detalhesConstrutivos": [{"descricao": string, "fonte": string, "pagina": number|null}],
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
