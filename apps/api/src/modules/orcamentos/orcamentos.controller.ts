import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { OrcamentosService } from './orcamentos.service';
import { OrcamentoExportService, type FormatoExport } from './orcamento-export.service';
import { AdicionarItemDto, AtualizarItemDto } from './dto';

@ApiTags('orcamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class OrcamentosController {
  constructor(
    private readonly orcamentos: OrcamentosService,
    private readonly exportSvc: OrcamentoExportService,
  ) {}

  @Post('obras/:obraId/orcamentos')
  @RequirePermissions('orcamento:revisar')
  criar(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string) {
    return this.orcamentos.criar(user.tenantId, user.userId, obraId);
  }

  @Get('orcamentos')
  @RequirePermissions('orcamento:ler')
  list(@CurrentUser() user: AuthUser) {
    return this.orcamentos.list(user.tenantId);
  }

  @Get('orcamentos/:id')
  @RequirePermissions('orcamento:ler')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orcamentos.get(user.tenantId, id);
  }

  @Post('orcamentos/:id/itens')
  @RequirePermissions('orcamento:revisar')
  adicionar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AdicionarItemDto) {
    return this.orcamentos.adicionarItem(user.tenantId, user.userId, id, dto);
  }

  @Patch('orcamentos/:id/itens/:itemId')
  @RequirePermissions('orcamento:revisar')
  atualizar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: AtualizarItemDto) {
    return this.orcamentos.atualizarItem(user.tenantId, user.userId, id, itemId, dto);
  }

  @Delete('orcamentos/:id/itens/:itemId')
  @RequirePermissions('orcamento:revisar')
  remover(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('itemId') itemId: string, @Query('justificativa') justificativa?: string) {
    return this.orcamentos.removerItem(user.tenantId, user.userId, id, itemId, justificativa);
  }

  @Post('orcamentos/:id/versoes')
  @RequirePermissions('orcamento:revisar')
  criarVersao(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orcamentos.criarVersao(user.tenantId, user.userId, id);
  }

  @Get('orcamentos/:id/versoes')
  @RequirePermissions('orcamento:ler')
  versoes(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orcamentos.listarVersoes(user.tenantId, id);
  }

  @Get('orcamentos/:id/versoes/comparar')
  @RequirePermissions('orcamento:ler')
  comparar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('a') a: string, @Query('b') b: string) {
    return this.orcamentos.compararVersoes(user.tenantId, id, Number(a), Number(b));
  }

  @Post('orcamentos/:id/aprovar')
  @RequirePermissions('orcamento:aprovar')
  aprovar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orcamentos.aprovar(user.tenantId, user.userId, id);
  }

  @Get('orcamentos/:id/exportar')
  @RequirePermissions('orcamento:exportar')
  async exportar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('formato') formato: FormatoExport = 'pdf', @Res() res: Response): Promise<void> {
    const { filename, mimeType, conteudo } = await this.exportSvc.exportar(user.tenantId, id, formato);
    res.set({ 'Content-Type': mimeType, 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(conteudo);
  }
}
