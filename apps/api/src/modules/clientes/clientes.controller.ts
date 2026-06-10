import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  @RequirePermissions('clientes:ler')
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.clientes.list(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('clientes:ler')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientes.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('clientes:escrever')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClienteDto) {
    return this.clientes.create(user.tenantId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('clientes:escrever')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientes.update(user.tenantId, user.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('clientes:escrever')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.clientes.remove(user.tenantId, user.userId, id);
  }
}
