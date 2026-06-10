/**
 * Agregações de dashboard (domínio puro, testável). A coleta de dados fica no
 * service (Prisma); aqui só transformamos linhas em métricas.
 */
export function tempoMedioMinutos(orcs: { createdAt: Date | string; aprovadoEm: Date | string | null }[]): number | null {
  const aprovados = orcs.filter((o) => o.aprovadoEm);
  if (!aprovados.length) return null;
  const soma = aprovados.reduce((s, o) => s + (new Date(o.aprovadoEm as string).getTime() - new Date(o.createdAt).getTime()), 0);
  return Math.round(soma / aprovados.length / 60_000); // minutos
}

export function tendenciaPorMes(
  orcs: { createdAt: Date | string; valorTotal: number | string }[],
  meses = 6,
): { mes: string; total: number; valor: number }[] {
  const map = new Map<string, { total: number; valor: number }>();
  for (const o of orcs) {
    const mes = new Date(o.createdAt).toISOString().slice(0, 7); // YYYY-MM
    const cur = map.get(mes) ?? { total: 0, valor: 0 };
    map.set(mes, { total: cur.total + 1, valor: cur.valor + Number(o.valorTotal) });
  }
  return [...map.entries()]
    .map(([mes, v]) => ({ mes, total: v.total, valor: Math.round(v.valor * 100) / 100 }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-meses);
}

/** Soma `valor` agrupando por `chave`, retornando o top N decrescente. */
export function topPorChave<T>(
  itens: T[],
  chave: (t: T) => string | null | undefined,
  valor: (t: T) => number,
  topN = 8,
): { chave: string; total: number }[] {
  const map = new Map<string, number>();
  for (const it of itens) {
    const k = chave(it);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + valor(it));
  }
  return [...map.entries()]
    .map(([chave, total]) => ({ chave, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

/** Taxa de conversão comercial = ganhos / decididos (aprovados / (aprovados + recusados)). 0 se nada decidido. */
export function taxaConversao(aprovados: number, recusados: number): number {
  const decididos = aprovados + recusados;
  return decididos > 0 ? Math.round((aprovados / decididos) * 1000) / 1000 : 0;
}

/** Ticket médio = valor total aprovado / quantidade de aprovados. 0 se nenhum aprovado. */
export function ticketMedio(valorAprovado: number, qtdAprovados: number): number {
  return qtdAprovados > 0 ? Math.round((valorAprovado / qtdAprovados) * 100) / 100 : 0;
}
