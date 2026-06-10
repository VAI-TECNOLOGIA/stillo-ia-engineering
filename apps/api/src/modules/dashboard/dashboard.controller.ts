import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('operacional')
  @RequirePermissions('dashboard:operacional')
  operacional(@CurrentUser() user: AuthUser) {
    return this.dashboard.operacional(user.tenantId);
  }

  @Get('executivo')
  @RequirePermissions('dashboard:executivo')
  executivo(@CurrentUser() user: AuthUser) {
    return this.dashboard.executivo(user.tenantId);
  }
}
