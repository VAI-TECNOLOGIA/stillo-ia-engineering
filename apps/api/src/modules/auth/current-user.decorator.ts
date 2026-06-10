import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './jwt.strategy';

/** Injeta o usuário autenticado: `metodo(@CurrentUser() user: AuthUser)`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
