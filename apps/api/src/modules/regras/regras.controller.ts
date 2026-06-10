import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RegraCategoria } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { RegrasService } from './regras.service';
import { CreateRegraDto, UpdateRegraDto } from './dto';

@ApiTags('regras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('regras:gerir')
@Controller('regras')
export class RegrasController {
  constructor(private readonly regras: RegrasService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('categoria') categoria?: RegraCategoria) {
    return this.regras.list(user.tenantId, categoria);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.regras.get(user.tenantId, id);
  }

  @Get(':id/versoes')
  versoes(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.regras.listVersoes(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRegraDto) {
    return this.regras.create(user.tenantId, user.userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRegraDto) {
    return this.regras.update(user.tenantId, user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.regras.remove(user.tenantId, user.userId, id);
  }
}
