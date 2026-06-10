import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { IaChatService } from './ia-chat.service';
import { ChatDto } from './dto';

@ApiTags('ia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ia')
export class IaChatController {
  constructor(private readonly ia: IaChatService) {}

  @Post('chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // IA é cara: 20/min por IP
  @RequirePermissions('ia:usar')
  chat(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.ia.chat(user.tenantId, user.userId, dto.mensagem, dto.conversaId);
  }

  @Get('conversas/:id')
  @RequirePermissions('ia:usar')
  conversa(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ia.obterConversa(user.tenantId, id);
  }
}
