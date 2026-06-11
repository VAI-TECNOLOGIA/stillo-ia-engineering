import { Injectable } from '@nestjs/common';
import { mesmoNumero } from './numeric.util';

/**
 * CONSENSO ENTRE IAs (Gemini + Claude + GPT).
 * Cada IA lê o arquivo de forma INDEPENDENTE e devolve os valores de um campo.
 * Este serviço bate as leituras campo a campo:
 *  - todas as que leram concordam → CONSENSO (libera)
 *  - alguma diverge / só uma leu / ninguém leu → vira pendência (notifica o usuário)
 * Política padrão = exigir concordância de TODAS as que leram (o cliente quer 100%).
 */

export type ConsensoStatus =
  | 'CONSENSO'       // ≥ mínimo de IAs leram e TODAS concordam → confiável
  | 'MAIORIA'        // maioria concorda, minoria diverge (só com política 'maioria')
  | 'DIVERGENTE'     // leituras conflitam → ILEGÍVEL/incerto → confirmar
  | 'LIDO_POR_UMA'   // só 1 IA leu o campo → sem corroboração → confirmar
  | 'NAO_LIDO';      // nenhuma IA leu → ausente no documento → confirmar

export interface VotoIA {
  provider: string;          // 'openai' | 'anthropic' | 'gemini'
  valor: number | null;      // já normalizado (metros, m²…) ou null
}

export interface ConsensoCampo {
  campo: string;
  valor: number | null;      // valor de consenso (null se não confiável)
  status: ConsensoStatus;
  confiavel: boolean;        // true só em CONSENSO (ou MAIORIA se política permitir)
  concordam: number;         // quantas IAs concordam com o valor final
  leram: number;             // quantas IAs leram (não-nulo)
  votos: VotoIA[];           // rastreabilidade: o que cada IA respondeu
}

export interface PoliticaConsenso {
  /** 'todas' = exige concordância de todas as que leram (recomendado p/ orçamento). */
  modo: 'todas' | 'maioria';
  /** Mínimo de IAs que precisam ter lido p/ considerar consenso (default 2). */
  minLeituras: number;
  tolRel: number;
  tolAbs: number;
}

export const POLITICA_PADRAO: PoliticaConsenso = { modo: 'todas', minLeituras: 2, tolRel: 0.005, tolAbs: 0.01 };

@Injectable()
export class ConsensusService {
  /** Consenso de UM campo a partir dos votos das IAs. */
  consensoCampo(campo: string, votos: VotoIA[], politica: PoliticaConsenso = POLITICA_PADRAO): ConsensoCampo {
    const leram = votos.filter((v) => v.valor !== null) as (VotoIA & { valor: number })[];

    if (leram.length === 0) {
      return { campo, valor: null, status: 'NAO_LIDO', confiavel: false, concordam: 0, leram: 0, votos };
    }
    if (leram.length === 1) {
      // uma única IA leu — sem corroboração, não é confiável p/ orçamento
      return { campo, valor: null, status: 'LIDO_POR_UMA', confiavel: false, concordam: 1, leram: 1, votos };
    }

    // agrupa votos por valor (com tolerância)
    const grupos: { valor: number; membros: number }[] = [];
    for (const v of leram) {
      const g = grupos.find((x) => mesmoNumero(x.valor, v.valor, politica.tolRel, politica.tolAbs));
      if (g) g.membros++;
      else grupos.push({ valor: v.valor, membros: 1 });
    }
    grupos.sort((a, b) => b.membros - a.membros);
    const maior = grupos[0];
    const todasConcordam = maior.membros === leram.length;
    const temMaioria = maior.membros > leram.length / 2;

    if (todasConcordam && leram.length >= politica.minLeituras) {
      return { campo, valor: maior.valor, status: 'CONSENSO', confiavel: true, concordam: maior.membros, leram: leram.length, votos };
    }
    if (politica.modo === 'maioria' && temMaioria) {
      return { campo, valor: maior.valor, status: 'MAIORIA', confiavel: true, concordam: maior.membros, leram: leram.length, votos };
    }
    // divergência real (sem concordância total; ou maioria mas política exige todas)
    return { campo, valor: null, status: 'DIVERGENTE', confiavel: false, concordam: maior.membros, leram: leram.length, votos };
  }

  /**
   * Consenso de um conjunto de campos. Entrada: para cada IA, um mapa
   * campo→valor (já normalizado). Saída: 1 ConsensoCampo por campo.
   */
  consolidar(
    leiturasPorIa: { provider: string; campos: Record<string, number | null> }[],
    campos: string[],
    politica: PoliticaConsenso = POLITICA_PADRAO,
  ): ConsensoCampo[] {
    return campos.map((campo) => {
      const votos: VotoIA[] = leiturasPorIa.map((l) => ({ provider: l.provider, valor: l.campos[campo] ?? null }));
      return this.consensoCampo(campo, votos, politica);
    });
  }

  /** Campos que NÃO atingiram consenso confiável → viram notificação/pendência. */
  pendencias(consensos: ConsensoCampo[]): ConsensoCampo[] {
    return consensos.filter((c) => !c.confiavel);
  }

  /**
   * Gera a mensagem de notificação ao usuário p/ um campo não-confiável.
   * Ex.: "Atenção: a largura da piscina está ilegível — as IAs divergiram
   *       (GPT: 4.5, Gemini: 4.2). Confirme o valor para prosseguir."
   */
  mensagemPendencia(c: ConsensoCampo, rotuloAmigavel?: string): string {
    const alvo = rotuloAmigavel ?? c.campo;
    const detalhe = c.votos
      .filter((v) => v.valor !== null)
      .map((v) => `${v.provider}: ${v.valor}`)
      .join(', ');
    switch (c.status) {
      case 'DIVERGENTE':
        return `Atenção: ${alvo} está ilegível — as IAs divergiram (${detalhe}). Confirme o valor para prosseguir.`;
      case 'LIDO_POR_UMA':
        return `Atenção: ${alvo} foi lido por apenas uma IA (${detalhe}), sem confirmação das demais. Confirme o valor.`;
      case 'NAO_LIDO':
        return `Atenção: ${alvo} não foi identificado em nenhuma leitura do documento. Informe o valor manualmente.`;
      default:
        return `Atenção: ${alvo} precisa de confirmação manual.`;
    }
  }
}
