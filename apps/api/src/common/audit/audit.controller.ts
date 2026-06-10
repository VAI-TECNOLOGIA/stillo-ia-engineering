import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import type { AuthUser } from '../../modules/auth/jwt.strategy';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** GET /audit/recent?limit=100 — trilha de auditoria recente do tenant */
  @Get('recent')
  @RequirePermissions('auditoria:ler')
  recent(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Number(limit ?? 100), 500);
    return this.audit.listRecent(user.tenantId, n);
  }
}
