/**
 * Seed de desenvolvimento: tenant + usuários + regras de engenharia + produtos
 * + um cliente/obra/piscina de exemplo. Idempotente (upsert/replace).
 *
 *   pnpm --filter @stillo/api prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'stillo' },
    update: {},
    create: { nome: 'Stillo Piscinas', slug: 'stillo', plano: 'pro' },
  });

  // ── Usuários ──────────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash('stillo123', 10);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@stillo.com' } },
    update: {},
    create: { tenantId: tenant.id, nome: 'Administrador', email: 'admin@stillo.com', passwordHash: senhaHash, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'orcamentista@stillo.com' } },
    update: {},
    create: { tenantId: tenant.id, nome: 'Orçamentista', email: 'orcamentista@stillo.com', passwordHash: senhaHash, role: 'ORCAMENTISTA' },
  });

  // ── Regras de engenharia (editáveis pelo admin no produto) ──────────────────
  await prisma.regra.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.regra.createMany({
    data: [
      {
        tenantId: tenant.id, nome: 'LED a cada 1,5m de borda', categoria: 'ILUMINACAO', prioridade: 100, ativo: true,
        quando: { fato: 'piscina.sistemas', op: 'contem', valor: 'LED' },
        entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'LED', descricao: 'Refletor LED de embutir', quantidade: 'teto(piscina.perimetroM / 1.5)', criterioProduto: { categoria: 'LED' } }],
      },
      {
        tenantId: tenant.id, nome: 'Iluminação em duas paredes (largura > 6m)', categoria: 'ILUMINACAO', prioridade: 90, ativo: true,
        quando: { fato: 'piscina.larguraM', op: '>', valor: 6 },
        entao: [{ tipo: 'AVISO', mensagem: 'Largura > 6m: distribuir a iluminação em duas paredes.' }],
      },
      {
        tenantId: tenant.id, nome: 'Filtragem por volume (turnover ~80m³)', categoria: 'FILTRAGEM', prioridade: 80, ativo: true,
        quando: { fato: 'piscina.volumeM3', op: '>', valor: 0 },
        entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'FILTRAGEM', descricao: 'Conjunto motobomba + filtro', quantidade: 'max(1, teto(piscina.volumeM3 / 80))', criterioProduto: { categoria: 'FILTRAGEM' } }],
      },
      {
        tenantId: tenant.id, nome: 'Aquecimento quando solicitado', categoria: 'AQUECIMENTO', prioridade: 70, ativo: true,
        quando: { fato: 'piscina.sistemas', op: 'contem', valor: 'AQUECIMENTO' },
        entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'AQUECIMENTO', descricao: 'Trocador de calor', quantidade: 1, criterioProduto: { categoria: 'AQUECIMENTO' } }],
      },
      {
        tenantId: tenant.id, nome: 'Tratamento por volume', categoria: 'TRATAMENTO', prioridade: 60, ativo: true,
        quando: { fato: 'piscina.volumeM3', op: '>', valor: 0 },
        entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'TRATAMENTO', descricao: 'Kit de tratamento de água', quantidade: 1 }],
      },
    ],
  });

  // ── Produtos de exemplo ─────────────────────────────────────────────────────
  const produtos = [
    { sku: 'LED-1801', nome: 'Refletor LED 18W embutir', categoria: 'LED', fabricante: 'Brustec', preco: 89.9, especificacoes: { potenciaW: 18, tipo: 'embutir' } },
    { sku: 'BMB-050', nome: 'Motobomba 1/2cv', categoria: 'FILTRAGEM', fabricante: 'Jacuzzi', preco: 740, especificacoes: { potenciaCv: 0.5, vazaoM3h: 8 } },
    { sku: 'TC-40000', nome: 'Trocador de calor 40.000 kcal', categoria: 'AQUECIMENTO', fabricante: 'TholzPro', preco: 4200, especificacoes: { kcal: 40000 } },
  ];
  for (const p of produtos) {
    await prisma.produto.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: { preco: p.preco },
      create: { tenantId: tenant.id, ...p },
    });
  }

  // ── Cliente / Obra / Piscina de exemplo ─────────────────────────────────────
  const cliente = await prisma.cliente.create({
    data: { tenantId: tenant.id, nome: 'Família Silva', documento: '000.000.000-00', createdById: admin.id },
  });
  const obra = await prisma.obra.create({
    data: { tenantId: tenant.id, clienteId: cliente.id, nome: 'Residência Silva', cidade: 'São Luís', uf: 'MA', regiao: 'NORDESTE', status: 'EM_DIMENSIONAMENTO', createdById: admin.id },
  });
  await prisma.piscina.create({
    data: {
      tenantId: tenant.id, obraId: obra.id, nome: 'Piscina principal', tipo: 'EXTERNA',
      comprimentoM: 8, larguraM: 4, profundidadeM: 1.5, volumeM3: 48,
      sistemas: { create: [{ tipo: 'LED' }, { tipo: 'AQUECIMENTO' }] },
    },
  });

  console.log('✅ Seed concluído.');
  console.log('   Login: admin@stillo.com / stillo123');
  console.log(`   Tenant: ${tenant.slug}  Obra exemplo: ${obra.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
