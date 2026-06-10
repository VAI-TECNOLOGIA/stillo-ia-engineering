import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BaseDisciplineExtractor } from './base.extractor';
import { ExtracaoArquitetonicaSchema, type ExtracaoArquitetonica } from '../extraction.schemas';

const EVID = `{"valor": number|string|boolean|null, "fonte": string|null, "pagina": number|null, "status": "CONFIRMADO"|"NAO_IDENTIFICADO"}`;

@Injectable()
export class ArchitecturalExtractor extends BaseDisciplineExtractor<ExtracaoArquitetonica> {
  protected readonly logger = new Logger(ArchitecturalExtractor.name);
  readonly disciplina = 'ARQUITETONICO';
  protected readonly schema = ExtracaoArquitetonicaSchema;

  protected readonly promptDisciplina = `Você é um arquiteto sênior especialista em leitura de plantas arquitetônicas de áreas de lazer e piscinas.

VOCÊ SÓ PODE EXTRAIR (escopo ARQUITETÔNICO):
• Corpos d'água: piscina adulto, piscina infantil, spa, prainha, espelho d'água — com NOME exatamente como escrito na planta
• Áreas em m² ESCRITAS na planta (ex.: "PISCINA ADULTO A=41,40m²")
• Comprimento e largura COTADOS (cotas explícitas com valor numérico escrito)
• Formato do corpo d'água quando descrito (retangular, orgânico, em L)
• Deck: área escrita
• Sauna: presença indicada na planta (ambiente nomeado "SAUNA")
• Borda infinita: indicação explícita ("borda infinita", "overflow", "borda lâmina")
• Revestimentos especificados em legenda/notas

VOCÊ NUNCA PODE EXTRAIR (fora da sua disciplina — IGNORE mesmo que apareça):
✗ Bombas, filtros, vazões, potências, tubulações (disciplina HIDRÁULICA)
✗ Profundidades (disciplina CORTES — cota de corte, não de planta)
✗ Circuitos, refletores, cargas elétricas (disciplina ELÉTRICA)
✗ Equipamentos e modelos (disciplina EQUIPAMENTOS)
✗ Armaduras, concreto, fundações (disciplina ESTRUTURAL)

ATENÇÃO CRÍTICA:
- NUNCA confunda piscina adulto com piscina infantil. São corpos SEPARADOS.
- Cada corpo d'água do projeto vira UMA entrada em corposDagua — não consolide.
- Área escrita ≠ área calculada: se a planta só tem lados cotados e NÃO tem a área escrita, devolva areaM2 com valor null e status NAO_IDENTIFICADO (calcular é PROIBIDO).

Responda APENAS JSON válido neste formato:
{
  "disciplina": "ARQUITETONICO",
  "corposDagua": [{"nome": string, "tipoCorpo": "PISCINA_ADULTO"|"PISCINA_INFANTIL"|"SPA"|"PRAINHA"|"ESPELHO_DAGUA"|"DESCONHECIDO", "areaM2": ${EVID}, "comprimentoM": ${EVID}, "larguraM": ${EVID}, "formato": ${EVID}}],
  "deckAreaM2": ${EVID},
  "sauna": ${EVID},
  "bordaInfinita": ${EVID},
  "revestimentos": [{"local": string, "descricao": string, "fonte": string, "pagina": number|null}],
  "observacoes": string[]
}`;

  constructor(ai: AiService) { super(ai); }
}
