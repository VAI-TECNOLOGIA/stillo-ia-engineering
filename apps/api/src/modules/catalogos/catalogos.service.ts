import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../common/storage/storage.types';
import { CatalogoIndexer, mapFonte } from './catalogo-indexer.service';
import type { UploadedFileLike } from '../arquivos/arquivos.service';

@Injectable()
export class CatalogosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly indexer: CatalogoIndexer,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async upload(tenantId: string, userId: string, file: UploadedFileLike) {
    const ext = extname(file.originalname).toLowerCase();
    const key = `${tenantId}/catalogos/${randomUUID()}${ext}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    const catalogo = await this.prisma.catalogo.create({
      data: { tenantId, nome: file.originalname, fonte: mapFonte(ext), storageKey: key, statusIndexacao: 'PENDENTE' },
    });
    await this.audit.log({ tenantId, autorId: userId, acao: 'UPLOAD', entidade: 'Catalogo', entidadeId: catalogo.id, depois: { nome: catalogo.nome, fonte: catalogo.fonte } });

    void this.indexer.process(catalogo.id); // inline/best-effort
    return catalogo;
  }

  list(tenantId: string) {
    return this.prisma.catalogo.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async get(tenantId: string, id: string) {
    const catalogo = await this.prisma.catalogo.findFirst({ where: { id, tenantId }, include: { _count: { select: { chunks: true } } } });
    if (!catalogo) throw new NotFoundException('Catálogo não encontrado.');
    return catalogo;
  }

  async reindexar(tenantId: string, id: string) {
    const catalogo = await this.get(tenantId, id);
    await this.prisma.catalogoChunk.deleteMany({ where: { catalogoId: catalogo.id } });
    void this.indexer.process(catalogo.id);
    return { status: 'INDEXANDO' };
  }
}
