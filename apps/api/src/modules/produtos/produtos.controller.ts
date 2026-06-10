import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ProdutosService } from './produtos.service';
import { ProdutoSearchService } from './produto-search.service';
import { CreateProdutoDto, QueryProdutoDto, RelacaoDto, UpdateProdutoDto } from './dto';

@ApiTags('produtos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('produtos')
export class ProdutosController {
  constructor(
    private readonly produtos: ProdutosService,
    private readonly search: ProdutoSearchService,
  ) {}

  @Get()
  @RequirePermissions('produtos:ler')
  list(@CurrentUser() user: AuthUser, @Query() query: QueryProdutoDto) {
    return this.produtos.list(user.tenantId, query);
  }

  /** Busca híbrida (lexical + vetorial) — usada pela seleção e pelo chat. */
  @Get('buscar')
  @RequirePermissions('produtos:ler')
  buscar(@CurrentUser() user: AuthUser, @Query('q') q: string, @Query('categoria') categoria?: string) {
    return this.search.buscar(user.tenantId, q ?? '', categoria);
  }

  @Get(':id')
  @RequirePermissions('produtos:ler')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.produtos.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('produtos:escrever')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProdutoDto) {
    return this.produtos.create(user.tenantId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('produtos:escrever')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProdutoDto) {
    return this.produtos.update(user.tenantId, user.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('produtos:escrever')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.produtos.remove(user.tenantId, user.userId, id);
  }

  @Post(':id/relacoes')
  @RequirePermissions('produtos:escrever')
  addRelacao(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RelacaoDto) {
    return this.produtos.addRelacao(user.tenantId, user.userId, id, dto);
  }

  @Delete('relacoes/:relacaoId')
  @RequirePermissions('produtos:escrever')
  removeRelacao(@CurrentUser() user: AuthUser, @Param('relacaoId') relacaoId: string) {
    return this.produtos.removeRelacao(user.tenantId, user.userId, relacaoId);
  }
}
