import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

export const PERMISSIONS_KEY = 'required_permissions';

/** Exige uma ou mais permissões na rota. Ex.: @RequirePermissions('regras:gerir') */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
