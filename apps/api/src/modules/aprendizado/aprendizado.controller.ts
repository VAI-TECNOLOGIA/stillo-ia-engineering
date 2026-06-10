import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { AprendizadoService } from './aprendizado.service';

@ApiTags('aprendizado')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('aprendizado')
export class AprendizadoController {
  constructor(private readonly aprendizado: AprendizadoService) {}

  @Get('estatisticas')
  @RequirePermissions('aprendizado:ler')
  estatisticas(@CurrentUser() user: AuthUser) {
    return this.aprendizado.estatisticas(user.tenantId);
  }

  @Get('sugestoes')
  @RequirePermissions('aprendizado:ler')
  sugestoes(@CurrentUser() user: AuthUser) {
    return this.aprendizado.sugestoes(user.tenantId);
  }

  @Get('base-conhecimento')
  @RequirePermissions('aprendizado:ler')
  baseConhecimento(@CurrentUser() user: AuthUser) {
    return this.aprendizado.listarBaseConhecimento(user.tenantId);
  }

  @Post('base-conhecimento/gerar')
  @HttpCode(200)
  @RequirePermissions('aprendizado:gerir')
  gerar(@CurrentUser() user: AuthUser) {
    return this.aprendizado.gerarBaseConhecimento(user.tenantId, user.userId);
  }
}
