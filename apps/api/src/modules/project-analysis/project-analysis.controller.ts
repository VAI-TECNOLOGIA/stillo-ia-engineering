import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ProjectAnalysisService } from './project-analysis.service';
import { ReclassificarDocumentoDto, ResolverPendenciaDto } from './project-analysis.dto';

@ApiTags('analise-projeto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ProjectAnalysisController {
  constructor(private readonly service: ProjectAnalysisService) {}

  /** Dispara a análise v2: classifica + extrai TODOS os PDFs da obra e consolida. */
  @Post('obras/:obraId/analise-projeto')
  @RequirePermissions('leitura:executar')
  disparar(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string) {
    return this.service.disparar(user.tenantId, user.userId, obraId);
  }

  /** Estado atual: documentos, classificações, consolidação, validação e resumo. */
  @Get('obras/:obraId/analise-projeto')
  @RequirePermissions('leitura:executar')
  obter(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string) {
    return this.service.obter(user.tenantId, obraId);
  }

  /** Trava de orçamento (ETAPA 9): consulta de liberação. */
  @Get('obras/:obraId/analise-projeto/liberacao')
  @RequirePermissions('orcamento:ler')
  liberacao(@CurrentUser() user: AuthUser, @Param('obraId') obraId: string) {
    return this.service.verificarLiberacaoOrcamento(user.tenantId, obraId);
  }

  /** Reclassificação manual de um documento (DESCONHECIDO → disciplina correta). */
  @Patch('analises-documento/:id/classificacao')
  @RequirePermissions('leitura:executar')
  reclassificar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReclassificarDocumentoDto) {
    return this.service.reclassificar(user.tenantId, user.userId, id, dto.documentType);
  }

  /** Resolve pendência/conflito com decisão humana rastreável (fonte CONFIRMACAO_HUMANA). */
  @Patch('analises-projeto/:id/resolver')
  @RequirePermissions('leitura:executar')
  resolver(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResolverPendenciaDto) {
    return this.service.resolverPendencia(user.tenantId, user.userId, id, dto);
  }

  /** ETAPA 8 — confirmação humana do resumo técnico (libera o orçamento). */
  @Post('analises-projeto/:id/confirmar')
  @RequirePermissions('leitura:executar')
  confirmar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.confirmar(user.tenantId, user.userId, id);
  }
}
