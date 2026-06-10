import { Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { CatalogosService } from './catalogos.service';
import type { UploadedFileLike } from '../arquivos/arquivos.service';

@ApiTags('catalogos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('catalogos:gerir')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file: UploadedFileLike) {
    if (!file) throw new BadRequestException('Arquivo ausente (campo "file").');
    return this.catalogos.upload(user.tenantId, user.userId, file);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.catalogos.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogos.get(user.tenantId, id);
  }

  @Post(':id/reindexar')
  reindexar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogos.reindexar(user.tenantId, id);
  }
}
