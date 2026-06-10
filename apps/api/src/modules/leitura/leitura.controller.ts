import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { LeituraService } from './leitura.service';
import { CorrigirLeituraDto, DispararLeituraDto } from './leitura.dto';

@ApiTags('leitura')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class LeituraController {
  constructor(private readonly leitura: LeituraService) {}

  @Post('obras/:obraId/leitura')
  @RequirePermissions('leitura:executar')
  disparar(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string, @Body() dto: DispararLeituraDto) {
    return this.leitura.disparar(user.tenantId, user.userId, obraId, dto.arquivoId);
  }

  @Get('obras/:obraId/leitura')
  @RequirePermissions('leitura:executar')
  obter(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string) {
    return this.leitura.obter(user.tenantId, obraId);
  }

  @Patch('leituras/:id')
  @RequirePermissions('leitura:executar')
  corrigir(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CorrigirLeituraDto) {
    return this.leitura.corrigir(user.tenantId, user.userId, id, dto.resultado);
  }

  @Post('leituras/:id/aplicar')
  @RequirePermissions('leitura:executar')
  aplicar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leitura.aplicar(user.tenantId, user.userId, id);
  }
}
