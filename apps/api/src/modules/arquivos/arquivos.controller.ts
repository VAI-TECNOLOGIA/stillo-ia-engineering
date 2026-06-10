import {
  Body, Controller, Delete, Get, Param, Post, Query, Res, StreamableFile,
  UploadedFile, UseGuards, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ArquivosService, type UploadedFileLike } from './arquivos.service';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (limite do multipart; real na Vercel ~4.5 MB → use upload direto)

@ApiTags('arquivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ArquivosController {
  constructor(private readonly arquivos: ArquivosService) {}

  // ─── Upload via função (pequenos arquivos / dev) ──────────────────────────

  @Post('obras/:obraId/arquivos')
  @RequirePermissions('obras:escrever')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('obraId') obraId: string,
    @UploadedFile() file: UploadedFileLike,
  ) {
    if (!file) throw new BadRequestException('Arquivo ausente (campo "file").');
    return this.arquivos.upload(user.tenantId, user.userId, obraId, file);
  }

  // ─── Upload direto (browser → Supabase, bypassa limite serverless) ────────

  /**
   * Retorna uma URL assinada para o browser fazer PUT diretamente no Supabase.
   * Usado quando o arquivo > ~4 MB (plantas de piscina são tipicamente 5–28 MB).
   *
   * GET /obras/:obraId/arquivos/upload-url?nome=planta.pdf
   */
  @Get('obras/:obraId/arquivos/upload-url')
  @RequirePermissions('obras:escrever')
  getUploadUrl(
    @CurrentUser() user: AuthUser,
    @Param('obraId') obraId: string,
    @Query('nome') nomeOriginal: string,
  ) {
    if (!nomeOriginal) throw new BadRequestException('Parâmetro "nome" é obrigatório.');
    return this.arquivos.createUploadUrl(user.tenantId, obraId, nomeOriginal);
  }

  /**
   * Confirma o upload direto: arquivo já está no Supabase, apenas registra no banco.
   * Body: { storageKey, nomeOriginal, mimeType, tamanhoBytes }
   *
   * POST /obras/:obraId/arquivos/confirm
   */
  @Post('obras/:obraId/arquivos/confirm')
  @RequirePermissions('obras:escrever')
  confirmUpload(
    @CurrentUser() user: AuthUser,
    @Param('obraId') obraId: string,
    @Body() body: { storageKey: string; nomeOriginal: string; mimeType: string; tamanhoBytes: number },
  ) {
    return this.arquivos.confirmUpload(user.tenantId, user.userId, obraId, body);
  }

  // ─── Listagem / download / remoção ───────────────────────────────────────

  @Get('obras/:obraId/arquivos')
  @RequirePermissions('obras:ler')
  list(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string) {
    return this.arquivos.listByObra(user.tenantId, obraId);
  }

  @Get('arquivos/:id/download')
  @RequirePermissions('obras:ler')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { arquivo, buffer } = await this.arquivos.download(user.tenantId, id);
    res.set({
      'Content-Type': arquivo.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(arquivo.nomeOriginal)}"`,
    });
    return new StreamableFile(buffer);
  }

  @Delete('arquivos/:id')
  @RequirePermissions('obras:escrever')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.arquivos.remove(user.tenantId, user.userId, id);
  }
}
