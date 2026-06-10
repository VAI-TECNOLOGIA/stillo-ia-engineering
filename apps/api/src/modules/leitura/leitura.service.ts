import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { LeituraQueue } from './leitura.queue';
import { ProjetoExtraidoSchema, volumeM3 } from './leitura.schema';

@Injectable()
export class LeituraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: LeituraQueue,
    private readonly audit: AuditService,
  ) {}

  /** Dispara a leitura inteligente de uma obra (OCR + extração IA). */
  async disparar(tenantId: string, userId: string, obraId: string, arquivoId?: string) {
    const obra = await this.prisma.obra.findFirst({
      where: { id: obraId, tenantId, deletedAt: null },
      include: { arquivos: { orderBy: { createdAt: 'desc' } } },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    const arquivo = arquivoId ? obra.arquivos.find((a) => a.id === arquivoId) : obra.arquivos[0];
    if (!arquivo) throw new BadRequestException('Anexe um arquivo à obra antes de ler.');

    const leitura = await this.prisma.leitura.create({
      data: { tenantId, obraId, arquivoId: arquivo.id, status: 'PENDENTE', geradoById: userId },
    });
    await this.prisma.obra.update({ where: { id: obraId }, data: { status: 'EM_LEITURA' } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'LEITURA_DISPARADA', entidade: 'Leitura', entidadeId: leitura.id });

    await this.queue.enqueue(leitura.id); // inline em dev → já processa

    return this.prisma.leitura.findUnique({ where: { id: leitura.id } });
  }

  /** Última leitura da obra (resultado editável). */
  async obter(tenantId: string, obraId: string) {
    return this.prisma.leitura.findFirst({ where: { tenantId, obraId }, orderBy: { createdAt: 'desc' } });
  }

  /** Correção manual do resultado (human-in-the-loop). */
  async corrigir(tenantId: string, userId: string, leituraId: string, resultado: unknown) {
    const antes = await this.prisma.leitura.findFirst({ where: { id: leituraId, tenantId } });
    if (!antes) throw new NotFoundException('Leitura não encontrada.');

    const validado = ProjetoExtraidoSchema.parse(resultado); // garante formato
    const leitura = await this.prisma.leitura.update({
      where: { id: leituraId },
      data: { resultado: validado as object, status: 'CONCLUIDO' },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPDATE', entidade: 'Leitura', entidadeId: leituraId, antes: antes.resultado, depois: validado });
    return leitura;
  }

  /** Aplica o resultado: cria as piscinas (origemLeitura) prontas p/ dimensionar. */
  async aplicar(tenantId: string, userId: string, leituraId: string) {
    const leitura = await this.prisma.leitura.findFirst({ where: { id: leituraId, tenantId } });
    if (!leitura) throw new NotFoundException('Leitura não encontrada.');

    const projeto = ProjetoExtraidoSchema.parse(leitura.resultado ?? { piscinas: [], avisos: [] });
    let criadas = 0;
    for (const p of projeto.piscinas) {
      await this.prisma.piscina.create({
        data: {
          tenantId,
          obraId: leitura.obraId,
          nome: p.nome ?? `Piscina ${criadas + 1}`,
          tipo: p.tipo ?? 'EXTERNA',
          comprimentoM: p.comprimentoM ?? undefined,
          larguraM: p.larguraM ?? undefined,
          profundidadeM: p.profundidadeM ?? undefined,
          volumeM3: volumeM3(p),
          origemLeitura: true,
          confiancaLeitura: p.confianca,
          sistemas: { create: p.sistemas.map((tipo) => ({ tipo })) },
        },
      });
      criadas++;
    }
    await this.prisma.obra.update({ where: { id: leitura.obraId }, data: { status: 'EM_DIMENSIONAMENTO' } });
    await this.audit.log({ tenantId, autorId: userId, acao: 'LEITURA_APLICADA', entidade: 'Leitura', entidadeId: leituraId, depois: { piscinasCriadas: criadas } });
    return { piscinasCriadas: criadas };
  }
}
