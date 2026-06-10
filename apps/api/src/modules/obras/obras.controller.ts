import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ObrasService } from './obras.service';
import { CreateObraDto, QueryObraDto, UpdateObraDto } from './dto/obra.dto';

@ApiTags('obras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('obras')
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Get()
  @RequirePermissions('obras:ler')
  list(@CurrentUser() user: AuthUser, @Query() query: QueryObraDto) {
    return this.obras.list(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('obras:ler')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.obras.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('obras:escrever')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateObraDto) {
    return this.obras.create(user.tenantId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('obras:escrever')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateObraDto) {
    return this.obras.update(user.tenantId, user.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('obras:escrever')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.obras.remove(user.tenantId, user.userId, id);
  }
}
