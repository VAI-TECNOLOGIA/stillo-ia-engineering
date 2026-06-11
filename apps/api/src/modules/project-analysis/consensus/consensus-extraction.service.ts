import { Injectable, Logger } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { AiService } from '../../ai/ai.service';
import type { ProviderNome } from '../../ai/ai.types';
import { ExtractorRegistry } from '../extractors/extractor.registry';
import { ConsensusService, type ConsensoCampo, POLITICA_PADRAO, type PoliticaConsenso } from './consensus.service';
import { achatarCamposCriticos, rotuloCampo } from './flatten';

export interface ResultadoConsenso {
  /** Extração bruta de cada IA (rastreabilidade). */
  porProvider: { provider: ProviderNome; extracao: unknown | null; erro?: string }[];
  /** Consenso campo a campo dos valores numéricos críticos. */
  consensos: ConsensoCampo[];
  /** Campos confiáveis (consenso) → liberam o orçamento. */
  confirmados: ConsensoCampo[];
  /** Mensagens p/ notificar o usuário (campos ilegíveis/divergentes). */
  notificacoes: string[];
  /** true só quando NÃO há nenhuma pendência (tudo bateu). */
  aprovado: boolean;
  /** Quais IAs participaram. */
  providersUsados: ProviderNome[];
}

/**
 * Orquestra o CONSENSO ENTRE IAs para uma disciplina:
 * roda a MESMA extração em cada IA configurada (independentes), achata os
 * campos numéricos críticos e bate via ConsensusService. Campos que não
 * atingem consenso confiável viram notificação ("a largura está ilegível…").
 */
@Injectable()
export class ConsensusExtractionService {
  private readonly logger = new Logger(ConsensusExtractionService.name);

  constructor(
    private readonly ai: AiService,
    private readonly registry: ExtractorRegistry,
    private readonly consensus: ConsensusService,
  ) {}

  async extrairComConsenso(
    tenantId: string,
    documentType: DocumentType,
    texto: string,
    imagens: string[] = [],
    politica: PoliticaConsenso = POLITICA_PADRAO,
  ): Promise<ResultadoConsenso> {
    const extractor = this.registry.get(documentType);
    const providersUsados = await this.ai.providersAtivos(tenantId);

    if (!extractor || providersUsados.length === 0) {
      return { porProvider: [], consensos: [], confirmados: [], notificacoes: [], aprovado: false, providersUsados };
    }

    // 1. Cada IA lê o arquivo de forma INDEPENDENTE (em paralelo)
    const porProvider = await Promise.all(
      providersUsados.map(async (provider) => {
        try {
          const { extracao, erro } = await extractor.extrair(tenantId, texto, imagens, provider);
          return { provider, extracao, erro };
        } catch (e) {
          const erro = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Extração consenso ${provider} falhou: ${erro}`);
          return { provider, extracao: null, erro };
        }
      }),
    );

    // 2. Achata os campos críticos de cada leitura
    const mapas = porProvider
      .filter((p) => p.extracao)
      .map((p) => ({ provider: p.provider as string, campos: achatarCamposCriticos(p.extracao) }));

    // 3. Consenso campo a campo (união de todos os campos que ao menos 1 IA leu)
    const todosCampos = [...new Set(mapas.flatMap((m) => Object.keys(m.campos)))];
    const consensos = this.consensus.consolidar(mapas, todosCampos, politica);

    const confirmados = consensos.filter((c) => c.confiavel);
    const pendentes = this.consensus.pendencias(consensos);
    const notificacoes = pendentes.map((c) => this.consensus.mensagemPendencia(c, rotuloCampo(c.campo)));

    return {
      porProvider,
      consensos,
      confirmados,
      notificacoes,
      aprovado: pendentes.length === 0 && confirmados.length > 0,
      providersUsados,
    };
  }
}
