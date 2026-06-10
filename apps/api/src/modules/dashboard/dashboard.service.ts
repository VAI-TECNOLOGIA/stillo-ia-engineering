import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { tempoMedioMinutos, tendenciaPorMes, topPorChave, taxaConversao, ticketMedio } from './dashboard-analytics';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async operacional(tenantId: string) {
    const agora = new Date();
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioPeriodo = new Date(agora);
    inicioPeriodo.setMonth(agora.getMonth() - 6);
    const base = { tenantId, deletedAt: null };

    const [
      porStatusRaw, hoje, mesAgg, aprovadoMesAgg, aprovadosTempo, orcsRank,
      obras, leituras, dimensionamentos, itensOrigemRaw, correcoes,
      obrasSemOrcamento, leiturasRevisar, tendenciaOrcs,
    ] = await Promise.all([
      this.prisma.orcamento.groupBy({ by: ['status'], where: base, _count: { _all: true }, _sum: { valorTotal: true } }),
      this.prisma.orcamento.count({ where: { ...base, createdAt: { gte: inicioDia } } }),
      this.prisma.orcamento.aggregate({ where: { ...base, createdAt: { gte: inicioMes } }, _sum: { valorTotal: true }, _count: { _all: true } }),
      this.prisma.orcamento.aggregate({ where: { ...base, status: 'APROVADO', aprovadoEm: { gte: inicioMes } }, _sum: { valorTotal: true } }),
      this.prisma.orcamento.findMany({ where: { ...base, status: 'APROVADO', aprovadoEm: { not: null } }, select: { createdAt: true, aprovadoEm: true }, take: 500 }),
      this.prisma.orcamento.findMany({ where: base, select: { createdById: true, valorTotal: true, obra: { select: { cliente: { select: { nome: true } } } } }, take: 2000 }),
      this.prisma.obra.count({ where: base }),
      this.prisma.leitura.count({ where: { tenantId } }),
      this.prisma.dimensionamento.count({ where: { tenantId } }),
      this.prisma.orcamentoItem.groupBy({ by: ['origem'], where: { orcamento: { tenantId, deletedAt: null } }, _count: { _all: true } }),
      this.prisma.correcao.count({ where: { tenantId } }),
      this.prisma.obra.count({ where: { ...base, orcamentos: { none: {} } } }),
      this.prisma.leitura.count({ where: { tenantId, status: 'REVISAO_MANUAL' } }),
      this.prisma.orcamento.findMany({ where: { ...base, createdAt: { gte: inicioPeriodo } }, select: { createdAt: true, valorTotal: true }, take: 5000 }),
    ]);

    // Métricas por status (1 só groupBy → contagem + soma de valor por status)
    const cnt = (s: string) => porStatusRaw.find((r) => r.status === s)?._count._all ?? 0;
    const val = (s: string) => Number(porStatusRaw.find((r) => r.status === s)?._sum.valorTotal ?? 0);
    const aprovados = cnt('APROVADO');
    const enviados = cnt('ENVIADO');
    const recusados = cnt('RECUSADO');
    const totalOrcamentos = porStatusRaw.reduce((s, r) => s + r._count._all, 0);
    const pipelineValor = val('RASCUNHO') + val('EM_REVISAO') + val('ENVIADO');

    // Ranking de vendedores + Top clientes (de uma única coleta)
    const topVend = topPorChave(orcsRank, (o) => o.createdById, (o) => Number(o.valorTotal), 5);
    const nomes = await this.prisma.user.findMany({ where: { tenantId, id: { in: topVend.map((t) => t.chave) } }, select: { id: true, nome: true } });
    const ranking = topVend.map((t) => ({ nome: nomes.find((n) => n.id === t.chave)?.nome ?? '—', valor: t.total }));
    const topClientes = topPorChave(orcsRank, (o) => o.obra?.cliente?.nome ?? null, (o) => Number(o.valorTotal), 5)
      .map((c) => ({ nome: c.chave, valor: c.total }));

    const ia = (o: string) => itensOrigemRaw.find((r) => r.origem === o)?._count._all ?? 0;

    return {
      // financeiro
      valorOrcadoMes: Number(mesAgg._sum.valorTotal ?? 0),
      pipelineValor,
      aprovadoValorMes: Number(aprovadoMesAgg._sum.valorTotal ?? 0),
      ticketMedio: ticketMedio(val('APROVADO'), aprovados),
      taxaConversao: taxaConversao(aprovados, recusados),
      tempoMedioMin: tempoMedioMinutos(aprovadosTempo),
      // volume
      orcamentosHoje: hoje,
      orcamentosMes: mesAgg._count._all,
      aguardandoRevisao: cnt('RASCUNHO') + cnt('EM_REVISAO'),
      aprovados,
      enviados,
      // funil comercial
      // funil acumulado (jornada): "enviados" = tudo que já foi ao cliente (enviado+aprovado+recusado)
      funil: { obras, leiturasIa: leituras, dimensionamentos, orcamentos: totalOrcamentos, enviados: enviados + aprovados + recusados, aprovados },
      // distribuição
      porStatus: ['RASCUNHO', 'EM_REVISAO', 'ENVIADO', 'APROVADO', 'RECUSADO'].map((s) => ({ status: s, total: cnt(s), valor: val(s) })),
      // tendência 6 meses
      tendencia: tendenciaPorMes(tendenciaOrcs.map((o) => ({ createdAt: o.createdAt, valorTotal: Number(o.valorTotal) })), 6),
      // rankings
      ranking,
      topClientes,
      // impacto da IA
      ia: { itensIa: ia('IA_RAG'), itensRegra: ia('REGRA'), itensManual: ia('MANUAL'), correcoes },
      // precisa de atenção
      atencao: { revisaoParada: cnt('EM_REVISAO'), obrasSemOrcamento, leiturasRevisar },
    };
  }

  async executivo(tenantId: string) {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioPeriodo = new Date(agora);
    inicioPeriodo.setMonth(agora.getMonth() - 6);
    const base = { tenantId, deletedAt: null };

    const [orcs, itens, valorMesAgg, aprovadosTempo] = await Promise.all([
      this.prisma.orcamento.findMany({
        where: { ...base, createdAt: { gte: inicioPeriodo } },
        select: { createdAt: true, valorTotal: true, obra: { select: { cidade: true } } },
        take: 5000,
      }),
      this.prisma.orcamentoItem.findMany({
        where: { orcamento: { tenantId, deletedAt: null, createdAt: { gte: inicioPeriodo } } },
        select: { descricao: true, quantidade: true, produto: { select: { fabricante: true } } },
        take: 10000,
      }),
      this.prisma.orcamento.aggregate({ where: { ...base, createdAt: { gte: inicioMes } }, _sum: { valorTotal: true } }),
      this.prisma.orcamento.findMany({ where: { ...base, status: 'APROVADO', aprovadoEm: { not: null } }, select: { createdAt: true, aprovadoEm: true }, take: 500 }),
    ]);

    return {
      valorOrcadoMes: Number(valorMesAgg._sum.valorTotal ?? 0),
      tempoMedioMin: tempoMedioMinutos(aprovadosTempo),
      tendencia: tendenciaPorMes(orcs.map((o) => ({ createdAt: o.createdAt, valorTotal: Number(o.valorTotal) })), 6),
      porCidade: topPorChave(orcs, (o) => o.obra?.cidade ?? null, () => 1, 8).map((c) => ({ cidade: c.chave, total: c.total })),
      equipamentos: topPorChave(itens, (i) => i.descricao, (i) => i.quantidade, 8).map((e) => ({ item: e.chave, total: e.total })),
      fabricantes: topPorChave(itens, (i) => i.produto?.fabricante ?? null, (i) => i.quantidade, 6).map((f) => ({ fabricante: f.chave, total: f.total })),
    };
  }
}
