import { NotFoundException } from '@nestjs/common';
import { ClientesService } from './clientes.service';

function makeService() {
  const prisma = {
    cliente: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new ClientesService(prisma as never, audit as never);
  return { service, prisma, audit };
}

describe('ClientesService', () => {
  it('cria cliente e registra auditoria', async () => {
    const { service, prisma, audit } = makeService();
    const criado = { id: 'c1', tenantId: 't1', nome: 'Família Silva' };
    prisma.cliente.create.mockResolvedValue(criado);

    const res = await service.create('t1', 'u1', { nome: 'Família Silva' });

    expect(res).toEqual(criado);
    expect(prisma.cliente.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 't1', nome: 'Família Silva' }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ acao: 'CREATE', entidade: 'Cliente', entidadeId: 'c1' }));
  });

  it('get lança NotFound quando não existe (respeitando tenant/soft-delete)', async () => {
    const { service, prisma } = makeService();
    prisma.cliente.findFirst.mockResolvedValue(null);
    await expect(service.get('t1', 'inexistente')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'inexistente', tenantId: 't1', deletedAt: null },
    });
  });

  it('list pagina por cursor (retorna nextCursor quando há mais)', async () => {
    const { service, prisma } = makeService();
    // limit 2 → busca 3; havendo 3, sobra 1 → nextCursor = id do 2º item
    prisma.cliente.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    const page = await service.list('t1', { limit: 2 } as never);

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe('b');
    expect(prisma.cliente.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
  });

  it('remove faz soft-delete (deletedAt) e audita DELETE', async () => {
    const { service, prisma, audit } = makeService();
    prisma.cliente.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1', nome: 'X', deletedAt: null });
    prisma.cliente.update.mockResolvedValue({ id: 'c1' });

    await service.remove('t1', 'u1', 'c1');

    expect(prisma.cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ acao: 'DELETE' }));
  });
});
