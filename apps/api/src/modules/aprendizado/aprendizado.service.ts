import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../../common/audit/audit.service';
import { agregarEstatisticas, detectarPadroes } from './aprendizado-analytics';

@Injectable()
export class AprendizadoService {
  private readonly logger = new Logger(AprendizadoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  private async correcoesRecentes(tenantId: string, dias = 90, limite = 2000) {
    const desde = new Date(Date.now() - dias * 86_400_000);
    return this.prisma.correcao.findMany({
      where: { tenantId, createdAt: { gte: desde } },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
  }

  async estatisticas(tenantId: string) {
    return agregarEstatisticas(await this.correcoesRecentes(tenantId));
  }

  async sugestoes(tenantId: string) {
    return detectarPadroes(await this.correcoesRecentes(tenantId));
  }

  /** Consolida correções com justificativa em entradas de Base de Conhecimento (indexadas p/ RAG). */
  async gerarBaseConhecimento(tenantId: string, userId: string) {
    const desde = new Date(Date.now() - 90 * 86_400_000);
    const correcoes = await this.prisma.correcao.findMany({
      where: { tenantId, justificativa: { not: null }, createdAt: { gte: desde } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    let criadas = 0;
    for (const c of correcoes) {
      const tag = `correcao:${c.id}`;
      const existe = await this.prisma.baseConhecimento.findFirst({ where: { tenantId, tags: { has: tag } } });
      if (existe) continue;

      const conteudo = montarConteudo(c.entidade, c.de, c.para, c.justificativa);
      const kb = await this.prisma.baseConhecimento.create({
        data: { tenantId, tipo: 'correcao', conteudo, tags: [tag, c.entidade] },
      });
      await this.embed(tenantId, kb.id, conteudo);
      criadas++;
    }
    await this.audit.log({ tenantId, autorId: userId, acao: 'APRENDER', entidade: 'BaseConhecimento', depois: { criadas, analisadas: correcoes.length } });
    return { criadas, analisadas: correcoes.length };
  }

  listarBaseConhecimento(tenantId: string) {
    return this.prisma.baseConhecimento.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, tipo: true, conteudo: true, tags: true, createdAt: true },
    });
  }

  private async embed(tenantId: string, id: string, texto: string): Promise<void> {
    try {
      const [emb] = await this.ai.embed(tenantId, [texto]);
      if (!emb?.length) return;
      const literal = `[${emb.join(',')}]`;
      await this.prisma.$executeRaw`UPDATE "BaseConhecimento" SET embedding = ${literal}::vector WHERE id = ${id}`;
    } catch (e) {
      this.logger.debug(`Embedding de conhecimento não gerado: ${String(e)}`);
    }
  }
}

function montarConteudo(entidade: string, de: unknown, para: unknown, justificativa: string | null): string {
  const fmt = (v: unknown) => {
    const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    return Object.keys(o).length ? JSON.stringify(o) : '—';
  };
  return `Correção em ${entidade}: de ${fmt(de)} para ${fmt(para)}. Justificativa: ${justificativa ?? ''}`.trim();
}
