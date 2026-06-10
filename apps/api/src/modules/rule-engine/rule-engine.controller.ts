import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { RuleEngineService } from './rule-engine.service';
import type { RegraAvaliavel } from './types';
import type { ObraInput, PiscinaInput } from './fact-builder';

interface SimularBody {
  regra: RegraAvaliavel;
  piscina: PiscinaInput;
  obra?: ObraInput;
}

@ApiTags('dimensionamento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RuleEngineController {
  constructor(private readonly engine: RuleEngineService) {}

  /** Dispara o dimensionamento da obra inteira (todas as piscinas). */
  @Post('obras/:obraId/dimensionamento')
  @RequirePermissions('dimensionamento:executar')
  gerar(@Param('obraId') obraId: string, @CurrentUser() user: AuthUser) {
    return this.engine.gerarDimensionamento(user.tenantId, obraId, user.userId);
  }

  /** Último dimensionamento gerado para a obra. */
  @Get('obras/:obraId/dimensionamento')
  @RequirePermissions('dimensionamento:executar')
  obter(@Param('obraId') obraId: string, @CurrentUser() user: AuthUser) {
    return this.engine.obterDimensionamento(user.tenantId, obraId);
  }

  /** Dry-run de uma regra contra uma piscina de exemplo (admin testa antes de ativar). */
  @Post('regras/simular')
  @RequirePermissions('regras:gerir')
  simular(@Body() body: SimularBody) {
    return this.engine.simularRegra(body.regra, body.piscina, body.obra ?? {});
  }
}
