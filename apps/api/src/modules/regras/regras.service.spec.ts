import { NotFoundException } from '@nestjs/common';
import { RegrasService } from './regras.service';

function makeService() {
  const prisma = {
    regra: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    regraVersao: { create: jest.fn(), findMany: jest.fn() },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new RegrasService(prisma as never, audit as never);
  return { service, prisma, audit };
}

const DTO = {
  nome: 'LED a cada 1,5m',
  categoria: 'ILUMINACAO' as const,
  quando: { fato: 'piscina.sistemas', op: 'contem', valor: 'LED' },
  entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'LED', descricao: 'LED', quantidade: 'teto(piscina.perimetroM/1.5)' }],
};

describe('RegrasService', () => {
  it('create grava versão 1 e snapshot', async () => {
    const { service, prisma } = makeService();
    prisma.regra.create.mockResolvedValue({ id: 'r1', versao: 1, ...DTO, prioridade: 100, ativo: true });

    const r = await service.create('t1', 'u1', DTO);

    expect(r.versao).toBe(1);
    expect(prisma.regra.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versao: 1, tenantId: 't1' }) }));
    expect(prisma.regraVersao.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versao: 1 }) }));
  });

  it('update incrementa a versão e cria novo snapshot', async () => {
    const { service, prisma } = makeService();
    prisma.regra.findFirst.mockResolvedValue({ id: 'r1', tenantId: 't1', versao: 1, ...DTO, prioridade: 100, ativo: true });
    prisma.regra.update.mockResolvedValue({ id: 'r1', versao: 2, ...DTO, prioridade: 90, ativo: true });

    const r = await service.update('t1', 'u1', 'r1', { prioridade: 90 });

    expect(prisma.regra.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versao: { increment: 1 } }) }));
    expect(r.versao).toBe(2);
    expect(prisma.regraVersao.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versao: 2 }) }));
  });

  it('get lança NotFound quando não existe no tenant', async () => {
    const { service, prisma } = makeService();
    prisma.regra.findFirst.mockResolvedValue(null);
    await expect(service.get('t1', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
