import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProdutoSearchService } from '../produtos/produto-search.service';

export interface Fonte {
  produtoId: string;
  sku: string;
  nome: string;
}

/**
 * Chat técnico (RAG): recupera produtos reais do catálogo, monta o contexto e
 * deixa a IA responder CITANDO o SKU. Regra inviolável: nada de produto que não
 * exista no catálogo (ver docs/03-IA-OCR-RAG.md).
 */
@Injectable()
export class IaChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly search: ProdutoSearchService,
  ) {}

  async chat(tenantId: string, userId: string, mensagem: string, conversaId?: string) {
    const produtos = await this.search.buscar(tenantId, mensagem, undefined, 6);
    const contexto = produtos
      .map((p) => `- SKU ${p.sku} | ${p.nome} | categoria ${p.categoria} | R$ ${p.preco} | specs ${JSON.stringify(p.especificacoes)}`)
      .join('\n');

    const system = [
      'Você é a IA Técnica da STILLO (engenharia de piscinas). Responda em português, objetivo e técnico.',
      'Use SOMENTE os produtos do catálogo abaixo. Cite o SKU entre parênteses ao recomendar.',
      'Se nenhum produto atender, diga que não encontrou no catálogo e sugira cadastrá-lo. NUNCA invente SKU/spec.',
      '',
      'CATÁLOGO DISPONÍVEL:',
      contexto || '(nenhum produto encontrado para esta consulta)',
    ].join('\n');

    const resp = await this.ai.complete(
      tenantId,
      [{ role: 'system', content: system }, { role: 'user', content: mensagem }],
      { temperature: 0.2 },
    );

    const conversa =
      (conversaId && (await this.prisma.chatConversa.findFirst({ where: { id: conversaId, tenantId } }))) ||
      (await this.prisma.chatConversa.create({ data: { tenantId, userId, titulo: mensagem.slice(0, 60) } }));

    const fontes: Fonte[] = produtos.map((p) => ({ produtoId: p.id, sku: p.sku, nome: p.nome }));
    await this.prisma.chatMensagem.create({ data: { conversaId: conversa.id, papel: 'USER', conteudo: mensagem } });
    await this.prisma.chatMensagem.create({
      data: { conversaId: conversa.id, papel: 'ASSISTANT', conteudo: resp.content, fontes: fontes as object, tokens: resp.tokens },
    });

    return { conversaId: conversa.id, resposta: resp.content, fontes };
  }

  async obterConversa(tenantId: string, id: string) {
    const conversa = await this.prisma.chatConversa.findFirst({
      where: { id, tenantId },
      include: { mensagens: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversa) throw new NotFoundException('Conversa não encontrada.');
    return conversa;
  }
}
