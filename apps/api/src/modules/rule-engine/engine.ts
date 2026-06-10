/**
 * Engine — avaliação determinística de regras → necessidades técnicas.
 * Domínio puro e testável (engine.spec.ts). Ver docs/04-MOTOR-DE-REGRAS.md.
 */
import { avaliarCondicao } from './condition';
import { avaliarExpressao } from './expression';
import type {
  Acao,
  Fatos,
  ItemDimensionado,
  RegraAvaliavel,
  ResultadoAvaliacao,
} from './types';

/**
 * Avalia um conjunto de regras contra fatos já derivados.
 * Regras são ordenadas por prioridade (desc) e só as ativas participam.
 */
export function avaliarRegras(regras: RegraAvaliavel[], fatos: Fatos): ResultadoAvaliacao {
  const itens: ItemDimensionado[] = [];
  const avisos: string[] = [];
  const atributos: Record<string, number | string> = {};
  const regrasDisparadas: string[] = [];

  const ordenadas = [...regras]
    .filter((r) => r.ativo)
    .sort((a, b) => b.prioridade - a.prioridade);

  for (const regra of ordenadas) {
    let disparou = false;
    try {
      if (!avaliarCondicao(regra.quando, fatos)) continue;
    } catch (e) {
      avisos.push(`Regra "${regra.nome}" ignorada (condição inválida): ${msg(e)}`);
      continue;
    }

    for (const acao of regra.entao) {
      try {
        aplicarAcao(acao, regra, fatos, { itens, avisos, atributos });
        disparou = true;
      } catch (e) {
        avisos.push(`Regra "${regra.nome}" — ação falhou: ${msg(e)}`);
      }
    }
    if (disparou) regrasDisparadas.push(regra.id);
  }

  return { itens: mesclarPorCategoria(itens), avisos, atributos, regrasDisparadas };
}

function aplicarAcao(
  acao: Acao,
  regra: RegraAvaliavel,
  fatos: Fatos,
  acc: { itens: ItemDimensionado[]; avisos: string[]; atributos: Record<string, number | string> },
): void {
  switch (acao.tipo) {
    case 'ADICIONAR_ITEM': {
      const qtdRaw = acao.quantidade;
      const quantidade =
        typeof qtdRaw === 'number' ? qtdRaw : avaliarExpressao(qtdRaw, fatos);
      if (quantidade <= 0) return; // nada a adicionar
      acc.itens.push({
        categoria: acao.categoria,
        descricao: acao.descricao,
        quantidade,
        unidade: acao.unidade ?? 'un',
        regraId: regra.id,
        criterioProduto: acao.criterioProduto,
        explicacao: {
          regraNome: regra.nome,
          expressaoQuantidade: String(qtdRaw),
          fatosUsados: extrairFatosReferenciados(String(qtdRaw), fatos),
        },
      });
      break;
    }
    case 'DEFINIR_ATRIBUTO':
      acc.atributos[acao.chave] = acao.valor;
      break;
    case 'EXIGIR_PRODUTO':
      acc.itens.push({
        categoria: acao.categoria,
        descricao: `Produto obrigatório (${acao.categoria})`,
        quantidade: 1,
        unidade: 'un',
        regraId: regra.id,
        criterioProduto: acao.criterioProduto,
        explicacao: { regraNome: regra.nome, expressaoQuantidade: '1', fatosUsados: {} },
      });
      break;
    case 'AVISO':
      acc.avisos.push(acao.mensagem);
      break;
  }
}

/** Mescla itens da mesma categoria+descrição somando quantidades (dedup). */
function mesclarPorCategoria(itens: ItemDimensionado[]): ItemDimensionado[] {
  const mapa = new Map<string, ItemDimensionado>();
  for (const item of itens) {
    const chave = `${item.categoria}::${item.descricao}`;
    const existente = mapa.get(chave);
    if (existente) {
      existente.quantidade += item.quantidade;
    } else {
      mapa.set(chave, { ...item });
    }
  }
  return [...mapa.values()];
}

/** Extrai só os fatos citados na expressão (para a trilha de explicação). */
function extrairFatosReferenciados(expr: string, fatos: Fatos): Fatos {
  const usados: Fatos = {};
  for (const chave of Object.keys(fatos)) {
    if (expr.includes(chave)) usados[chave] = fatos[chave];
  }
  return usados;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
