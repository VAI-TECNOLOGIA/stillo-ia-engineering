import { Body, Controller, Delete, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ConfigIntegracoesService } from './config-integracoes.service';
import { VincularOpenAiDto } from './dto';

@ApiTags('configuracoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('integracoes:gerir')
@Controller('config/integracoes')
export class ConfigIntegracoesController {
  constructor(private readonly service: ConfigIntegracoesService) {}

  @Get()
  status(@CurrentUser() user: AuthUser) {
    return this.service.status(user.tenantId);
  }

  @Put('openai')
  vincularOpenAi(@CurrentUser() user: AuthUser, @Body() dto: VincularOpenAiDto) {
    return this.service.vincularOpenAi(user.tenantId, user.userId, dto);
  }

  @Post('openai/testar')
  @HttpCode(200)
  testar(@CurrentUser() user: AuthUser) {
    return this.service.testar(user.tenantId);
  }

  @Delete('openai')
  desvincular(@CurrentUser() user: AuthUser) {
    return this.service.desvincularOpenAi(user.tenantId, user.userId);
  }
}
