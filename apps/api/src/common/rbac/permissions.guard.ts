import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { roleHasPermission, type Permission, type Role } from './permissions';

/**
 * Verifica se o usuário autenticado possui TODAS as permissões exigidas.
 * Usar em conjunto com o JwtAuthGuard (que popula request.user).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role: Role | undefined = request.user?.role;
    if (!role) throw new ForbiddenException('Usuário sem perfil definido.');

    const faltando = required.filter((p) => !roleHasPermission(role, p));
    if (faltando.length > 0) {
      throw new ForbiddenException(`Permissão negada: ${faltando.join(', ')}`);
    }
    return true;
  }
}
