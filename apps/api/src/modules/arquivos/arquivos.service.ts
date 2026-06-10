import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ArquivoTipo } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../../common/storage/storage.types';
import { SupabaseStorageProvider } from '../../common/storage/supabase-storage.provider';
import { VercelBlobProvider } from '../../common/storage/vercel-blob.provider';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ConfirmUploadDto {
  storageKey: string;   // path (supabase) ou URL completa (vercel-blob)
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
}

/** Resposta do endpoint upload-url (depende do provider ativo). */
export interface UploadUrlResponse {
  /** Provider que gerou as credenciais ('supabase' | 'vercel-blob'). */
  provider: 'supabase' | 'vercel-blob';
  /**
   * Supabase: URL pré-assinada para PUT diretamente no bucket.
   * Vercel Blob: URL base "https://api.vercel.com/v1/blob?filename=<encoded>"
   */
  uploadUrl: string;
  /**
   * Não usado: em Vercel Blob o token está embarcado na uploadUrl (sem header de auth).
   * Mantido para compatibilidade futura / Supabase.
   * @deprecated
   */
  clientToken?: string;
  /**
   * Chave a persistir no banco APÓS o upload.
   * - Supabase: caminho no bucket (ex: tenantId/obraId/uuid.pdf)
   * - Vercel Blob: determinado pela resposta do PUT (frontend recebe a URL e envia no /confirm)
   */
  storageKey: string;
}

@Injectable()
export class ArquivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly supabase: SupabaseStorageProvider,
    private readonly vercelBlob: VercelBlobProvider,
  ) {}

  /** Upload via função serverless (válido para arquivos <= ~4 MB na Vercel). */
  async upload(tenantId: string, userId: string, obraId: string, file: UploadedFileLike) {
    const obra = await this.prisma.obra.findFirst({ where: { id: obraId, tenantId, deletedAt: null } });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    const id = randomUUID();
    const pathname = `${tenantId}/${obraId}/${id}${extname(file.originalname).toLowerCase()}`;
    // O provider devolve a chave real (pode ser URL para Vercel Blob).
    const { key: storageKey } = await this.storage.put(pathname, file.buffer, file.mimetype);

    const arquivo = await this.prisma.arquivo.create({
      data: {
        tenantId,
        obraId,
        tipo: this.detectarTipo(file.originalname, file.mimetype),
        nomeOriginal: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        tamanhoBytes: file.size,
        statusProcessamento: 'PENDENTE',
      },
    });
    await this.audit.log({
      tenantId, autorId: userId, acao: 'UPLOAD', entidade: 'Arquivo', entidadeId: arquivo.id,
      depois: { nomeOriginal: arquivo.nomeOriginal, tipo: arquivo.tipo },
    });
    return arquivo;
  }

  /**
   * Gera credenciais para upload direto browser → storage (> 4 MB).
   * Suporta Vercel Blob (STORAGE_PROVIDER=vercel-blob) e
   * Supabase (STORAGE_PROVIDER=supabase).
   *
   * Vercel Blob:
   *   uploadUrl = "https://api.vercel.com/v1/blob?filename=<encoded>"
   *   clientToken = JWT para Authorization: Bearer
   *   storageKey  = URL final (retornada pelo PUT — frontend envia no /confirm)
   *
   * Supabase:
   *   uploadUrl = URL pré-assinada (token embutido no query string)
   *   storageKey = caminho no bucket (fixo antes do upload)
   */
  async createUploadUrl(tenantId: string, obraId: string, nomeOriginal: string): Promise<UploadUrlResponse> {
    const obra = await this.prisma.obra.findFirst({ where: { id: obraId, tenantId, deletedAt: null } });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    const id = randomUUID();
    const pathname = `${tenantId}/${obraId}/${id}${extname(nomeOriginal).toLowerCase()}`;

    // Vercel Blob — token embarcado na URL, sem header de auth no browser
    if (this.vercelBlob.isConfigured) {
      const uploadUrl = await this.vercelBlob.presignedUploadUrl(pathname);
      // storageKey sera a URL retornada pelo PUT (o frontend envia no /confirm)
      return { provider: 'vercel-blob', uploadUrl, storageKey: pathname };
    }

    // Supabase fallback
    if (this.supabase.isConfigured) {
      const uploadUrl = await this.supabase.signedUploadUrl(pathname);
      return { provider: 'supabase', uploadUrl, storageKey: pathname };
    }

    throw new BadRequestException(
      'Nenhum provider de storage configurado para upload direto. ' +
      'Configure BLOB_READ_WRITE_TOKEN (Vercel Blob) ou SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  /**
   * Confirma o upload direto: arquivo já está no storage, apenas registra no banco.
   * Chamado pelo frontend após o PUT direto ter sucesso.
   *
   * storageKey:
   *   Vercel Blob → URL completa retornada pelo PUT (ex: https://xxx.public.blob.vercel-storage.com/...)
   *   Supabase    → caminho no bucket (ex: tenantId/obraId/uuid.pdf)
   */
  async confirmUpload(tenantId: string, userId: string, obraId: string, dto: ConfirmUploadDto) {
    const obra = await this.prisma.obra.findFirst({ where: { id: obraId, tenantId, deletedAt: null } });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    // Validação mínima: chave deve pertencer ao tenant (path) ou ser URL de storage reconhecida
    const isVercelBlob = dto.storageKey.startsWith('https://') && dto.storageKey.includes('blob.vercel-storage.com');
    const isSupabase = dto.storageKey.startsWith(`${tenantId}/`) || (dto.storageKey.startsWith('https://') && dto.storageKey.includes('supabase'));
    const isValidPath = dto.storageKey.startsWith(`${tenantId}/`);
    if (!isVercelBlob && !isSupabase && !isValidPath) {
      throw new BadRequestException('storageKey inválida.');
    }

    const arquivo = await this.prisma.arquivo.create({
      data: {
        tenantId,
        obraId,
        tipo: this.detectarTipo(dto.nomeOriginal, dto.mimeType),
        nomeOriginal: dto.nomeOriginal,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        tamanhoBytes: dto.tamanhoBytes,
        statusProcessamento: 'PENDENTE',
      },
    });
    await this.audit.log({
      tenantId, autorId: userId, acao: 'UPLOAD', entidade: 'Arquivo', entidadeId: arquivo.id,
      depois: { nomeOriginal: arquivo.nomeOriginal, tipo: arquivo.tipo, via: 'direct-upload' },
    });
    return arquivo;
  }

  listByObra(tenantId: string, obraId: string) {
    return this.prisma.arquivo.findMany({ where: { tenantId, obraId }, orderBy: { createdAt: 'desc' } });
  }

  async get(tenantId: string, id: string) {
    const arquivo = await this.prisma.arquivo.findFirst({ where: { id, tenantId } });
    if (!arquivo) throw new NotFoundException('Arquivo não encontrado.');
    return arquivo;
  }

  async download(tenantId: string, id: string): Promise<{ arquivo: Awaited<ReturnType<ArquivosService['get']>>; buffer: Buffer }> {
    const arquivo = await this.get(tenantId, id);
    const buffer = await this.storage.get(arquivo.storageKey);
    return { arquivo, buffer };
  }

  async remove(tenantId: string, userId: string, id: string): Promise<{ id: string }> {
    const arquivo = await this.get(tenantId, id);
    await this.storage.delete(arquivo.storageKey).catch(() => undefined);
    await this.prisma.arquivo.delete({ where: { id: arquivo.id } });
    await this.audit.log({
      tenantId, autorId: userId, acao: 'DELETE', entidade: 'Arquivo', entidadeId: id,
      antes: { nomeOriginal: arquivo.nomeOriginal },
    });
    return { id };
  }

  private detectarTipo(nome: string, mime: string): ArquivoTipo {
    const ext = extname(nome).toLowerCase().replace('.', '');
    if (ext === 'pdf' || mime === 'application/pdf') return ArquivoTipo.PDF;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'].includes(ext) || mime.startsWith('image/')) return ArquivoTipo.IMAGEM;
    if (['dwg', 'dxf'].includes(ext)) return ArquivoTipo.DWG;
    return ArquivoTipo.DOCUMENTO;
  }
}
