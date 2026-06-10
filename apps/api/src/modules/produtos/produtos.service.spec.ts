import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProdutosService } from './produtos.service';
import { ProdutoIndexer } from './produto-indexer.service';

function makeService() {
  const prisma = { produto: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const indexer = { indexar: jest.fn().mockResolvedValue(undefined) };
  const service = new ProdutosService(prisma as never, audit as never, indexer as never);
  return { service, prisma, audit, indexer };
}

const DTO = { sku: 'BMB-050', nome: 'Motobomba 1/2cv', categoria: 'FILTRAGEM', preco: 740 };

describe('ProdutoIndexer.textoDe', () => {
  it('monta texto canônico com specs', () => {
    const t = ProdutoIndexer.textoDe({ nome: 'Bomba', categoria: 'FILTRAGEM', fabricante: 'Jacuzzi', modelo: 'X', especificacoes: { cv: 0.5 } });
    expect(t).toContain('Bomba');
    expect(t).toContain('FILTRAGEM');
    expect(t).toContain('Jacuzzi');
    expect(t).toContain('cv');
  });
});

describe('ProdutosService.create', () => {
  it('cria, dispara indexação e audita', async () => {
    const { service, prisma, indexer, audit } = makeService();
    prisma.produto.create.mockResolvedValue({ id: 'p1', ...DTO });
    const r = await service.create('t1', 'u1', DTO);
    expect(r.id).toBe('p1');
    expect(indexer.indexar).toHaveBeenCalledWith('t1', 'p1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ acao: 'CREATE', entidade: 'Produto' }));
  });

  it('converte SKU duplicado (P2002) em ConflictException', async () => {
    const { service, prisma } = makeService();
    prisma.produto.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }));
    await expect(service.create('t1', 'u1', DTO)).rejects.toBeInstanceOf(ConflictException);
  });
});
