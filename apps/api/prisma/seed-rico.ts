/**
 * Seed RICO de demonstração/teste — popula o tenant `stillo` com ~1 ano de dados
 * consistentes para o dashboard/funil/relatórios ficarem cheios e COERENTES.
 *
 * Gera a cadeia natural do funil: Cliente → Obra → (Leitura) → (Dimensionamento)
 * → (Orçamento) de forma probabilística, então obras > leituras > dim > orçamentos.
 *
 * Idempotente: limpa o transacional do tenant e recria. NÃO mexe em usuários base,
 * regras nem produtos. Rodar: DATABASE_URL=<neon> ts-node prisma/seed-rico.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const round2 = (n: number) => Math.round(n * 100) / 100;
const diasAtras = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x; };
const maisDias = (base: Date, d: number) => { const x = new Date(base); x.setDate(x.getDate() + d); return x; };
function weighted<T>(opts: [T, number][]): T {
  const total = opts.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of opts) { if ((r -= w) <= 0) return v; }
  return opts[0][0];
}

const CIDADES: [string, string, string][] = [
  ['São Luís', 'MA', 'NORDESTE'], ['Fortaleza', 'CE', 'NORDESTE'], ['Natal', 'RN', 'NORDESTE'],
  ['Recife', 'PE', 'NORDESTE'], ['Teresina', 'PI', 'NORDESTE'], ['Aquiraz', 'CE', 'NORDESTE'],
  ['Itapema', 'SC', 'SUL'], ['Balneário Camboriú', 'SC', 'SUL'],
];
const CLIENTES = [
  'Construtora Aurora', 'Condomínio Vila Mar', 'Resort Costa Azul', 'Engebras Ltda',
  'Família Andrade', 'Hotel Marazul', 'Família Costa', 'Incorporadora Horizonte',
  'Família Mendes', 'Clube Náutico Atlântico', 'Família Oliveira', 'Spa & Wellness Premium',
  'Marina Boa Vista', 'Família Ribeiro',
];
const VENDEDORES = [
  { nome: 'Ana Vendas', email: 'ana@stillo.com' },
  { nome: 'Bruno Costa', email: 'bruno@stillo.com' },
  { nome: 'Carla Dias', email: 'carla@stillo.com' },
  { nome: 'Diego Martins', email: 'diego@stillo.com' },
];
const ITENS: [string, string][] = [ // [descrição, sistema]
  ['Bomba de filtragem', 'FILTRAGEM'], ['Filtro de areia', 'FILTRAGEM'], ['Iluminação LED RGB', 'LED'],
  ['Trocador de calor', 'AQUECIMENTO'], ['Kit tratamento automático', 'TRATAMENTO'], ['Bomba de hidromassagem', 'HIDROMASSAGEM'],
  ['Casa de máquinas', 'FILTRAGEM'], ['Aquecedor a gás', 'AQUECIMENTO'], ['Cascata em inox', 'CASCATA'], ['Skimmer', 'FILTRAGEM'],
];
const STATUS_W: [string, number][] = [['APROVADO', 52], ['ENVIADO', 16], ['EM_REVISAO', 10], ['RASCUNHO', 8], ['RECUSADO', 14]];
const JUSTIF = [
  'Cliente pediu marca específica', 'Produto fora de estoque — troquei pelo substituto', 'Ajuste de potência pra metragem real',
  'Desconto negociado pela diretoria', 'Item duplicado removido', 'Fabricante preferencial da obra',
];

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'stillo' } });
  if (!tenant) throw new Error('Tenant "stillo" não encontrado — rode o seed base antes.');
  const tenantId = tenant.id;
  const admin = await prisma.user.findFirstOrThrow({ where: { tenantId, email: 'admin@stillo.com' } });
  const now = new Date();
  const capNow = (d: Date) => (d > now ? now : d);

  // Vendedores (idempotente)
  const vendedores = [admin];
  for (const v of VENDEDORES) {
    const u = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: v.email } }, update: {},
      create: { tenantId, nome: v.nome, email: v.email, passwordHash: admin.passwordHash, role: 'COMERCIAL' },
    });
    vendedores.push(u);
  }

  // Limpa transacional (mantém users/regras/produtos)
  await prisma.correcao.deleteMany({ where: { tenantId } });
  await prisma.arquivo.deleteMany({ where: { tenantId } });
  await prisma.obra.deleteMany({ where: { tenantId } }); // cascata: piscina, leitura, dimensionamento, orçamento(+itens)
  await prisma.cliente.deleteMany({ where: { tenantId } });

  const produtos = await prisma.produto.findMany({ where: { tenantId }, select: { id: true } });

  const itemIdsParaCorrigir: string[] = [];
  let numero = 1, obraIdx = 0;
  const stats = { obras: 0, leituras: 0, dimensionamentos: 0, orcamentos: 0, aprovados: 0 };

  for (const nomeCli of CLIENTES) {
    const cliente = await prisma.cliente.create({
      data: { tenantId, nome: nomeCli, documento: `${randInt(10, 99)}.${randInt(100, 999)}.${randInt(100, 999)}/0001-${randInt(10, 99)}`, createdById: admin.id, createdAt: diasAtras(randInt(80, 350)) },
    });

    const nObras = randInt(2, 5);
    for (let o = 0; o < nObras; o++) {
      const monthsAgo = obraIdx % 7; obraIdx++; // espalha por 0..6 meses (inclui o mês atual)
      const baseCreated = diasAtras(monthsAgo * 30 + (monthsAgo === 0 ? randInt(0, 6) : randInt(0, 27)));
      const [cidade, uf, regiao] = pick(CIDADES);
      const comp = randInt(6, 14), larg = randInt(3, 6), prof = 1.5;
      const obra = await prisma.obra.create({
        data: { tenantId, clienteId: cliente.id, nome: `Piscina ${nomeCli.split(' ')[0]} ${o + 1}`, cidade, uf, regiao, status: 'CONCLUIDA', createdById: admin.id, createdAt: baseCreated },
      });
      stats.obras++;
      await prisma.piscina.create({
        data: { tenantId, obraId: obra.id, nome: 'Piscina principal', tipo: 'EXTERNA', comprimentoM: comp, larguraM: larg, profundidadeM: prof, volumeM3: round2(comp * larg * prof), origemLeitura: true, confiancaLeitura: round2(0.8 + Math.random() * 0.18) },
      });

      // Funil probabilístico: nem toda obra avança até o fim
      if (Math.random() > 0.90) continue; // 10% param na obra
      const baixa = Math.random() < 0.16;
      await prisma.leitura.create({
        data: { tenantId, obraId: obra.id, status: baixa ? 'REVISAO_MANUAL' : 'CONCLUIDO', ocrConfianca: baixa ? round2(0.42 + Math.random() * 0.12) : round2(0.82 + Math.random() * 0.16), modeloIa: 'gpt-4o', geradoById: admin.id, createdAt: baseCreated },
      });
      stats.leituras++;

      if (Math.random() > 0.90) continue; // 10% param na leitura
      await prisma.dimensionamento.create({
        data: { tenantId, obraId: obra.id, status: 'CONCLUIDO', geradoById: pick(vendedores).id, createdAt: maisDias(baseCreated, 1) },
      });
      stats.dimensionamentos++;

      if (Math.random() > 0.82) continue; // 18% param no dimensionamento
      const nOrc = Math.random() < 0.15 ? 2 : 1; // ocasionalmente 2 propostas
      for (let k = 0; k < nOrc; k++) {
        const status = weighted(STATUS_W);
        const createdAt = capNow(maisDias(baseCreated, randInt(1, 6)));
        const vendedor = pick(vendedores);

        const itens = Array.from({ length: randInt(3, 6) }, () => {
          const [descricao, sistema] = pick(ITENS);
          const precoUnit = randInt(200, 5500);
          const quantidade = randInt(1, 8);
          const origem = weighted<'IA_RAG' | 'REGRA' | 'MANUAL'>([['REGRA', 45], ['IA_RAG', 40], ['MANUAL', 15]]);
          const usaProduto = produtos.length > 0 && Math.random() < 0.6;
          return { descricao, sistema: sistema as any, quantidade, precoUnit, subtotal: round2(precoUnit * quantidade), origem: origem as any, ...(usaProduto ? { produtoId: pick(produtos).id } : {}) };
        });
        const valorTotal = round2(itens.reduce((s, it) => s + it.subtotal, 0));
        const aprovado = status === 'APROVADO';
        let aprovadoEm: Date | undefined;
        if (aprovado) aprovadoEm = capNow(maisDias(createdAt, randInt(1, 8)));

        const orc = await prisma.orcamento.create({
          data: {
            tenantId, obraId: obra.id, numero: numero++, status: status as any, valorTotal, versaoAtual: 1,
            createdById: vendedor.id, createdAt,
            ...(aprovado ? { aprovadoById: vendedor.id, aprovadoEm } : {}),
            itens: { create: itens },
          },
          include: { itens: { select: { id: true } } },
        });
        stats.orcamentos++; if (aprovado) stats.aprovados++;
        if (orc.itens[0]) itemIdsParaCorrigir.push(orc.itens[0].id);
      }
    }
  }

  // Correções (alimentam o aprendizado + "Impacto da IA")
  for (const itemId of itemIdsParaCorrigir.slice(0, 18)) {
    await prisma.correcao.create({
      data: { tenantId, orcamentoItemId: itemId, entidade: 'OrcamentoItem', de: { obs: 'sugestão original' }, para: { obs: 'ajuste manual' }, justificativa: pick(JUSTIF), autorId: pick(vendedores).id, createdAt: diasAtras(randInt(5, 200)) },
    });
  }

  console.log('✅ Seed RICO concluído (funil coerente).');
  console.log(`   Clientes: ${CLIENTES.length} · Obras: ${stats.obras} → Leituras: ${stats.leituras} → Dimensionamentos: ${stats.dimensionamentos} → Orçamentos: ${stats.orcamentos} (aprovados: ${stats.aprovados})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
