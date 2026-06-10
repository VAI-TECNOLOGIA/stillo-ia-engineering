/**
 * Fonte única da verdade de RBAC (espelha docs/05-API-E-PERMISSOES.md).
 * Exposta em /auth/me para o front habilitar/ocultar ações.
 */
export type Permission =
  | 'clientes:ler' | 'clientes:escrever'
  | 'obras:ler' | 'obras:escrever'
  | 'leitura:executar'
  | 'dimensionamento:executar'
  | 'regras:gerir'
  | 'catalogos:gerir'
  | 'produtos:ler' | 'produtos:escrever'
  | 'orcamento:ler' | 'orcamento:revisar' | 'orcamento:aprovar' | 'orcamento:exportar'
  | 'ia:usar'
  | 'dashboard:operacional' | 'dashboard:executivo'
  | 'usuarios:gerir'
  | 'integracoes:gerir'
  | 'aprendizado:ler' | 'aprendizado:gerir'
  | 'auditoria:ler';

export type Role = 'ADMIN' | 'DIRETORIA' | 'GERENTE' | 'ORCAMENTISTA' | 'COMERCIAL' | 'CONSULTA';

const LEITURA_BASE: Permission[] = ['clientes:ler', 'obras:ler', 'produtos:ler', 'orcamento:ler', 'dashboard:operacional'];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'clientes:ler', 'clientes:escrever', 'obras:ler', 'obras:escrever',
    'leitura:executar', 'dimensionamento:executar', 'regras:gerir', 'catalogos:gerir',
    'produtos:ler', 'produtos:escrever', 'orcamento:ler', 'orcamento:revisar',
    'orcamento:aprovar', 'orcamento:exportar', 'ia:usar',
    'dashboard:operacional', 'dashboard:executivo', 'usuarios:gerir', 'integracoes:gerir',
    'aprendizado:ler', 'aprendizado:gerir', 'auditoria:ler',
  ],
  DIRETORIA: [...LEITURA_BASE, 'orcamento:aprovar', 'orcamento:exportar', 'dashboard:executivo', 'aprendizado:ler', 'auditoria:ler'],
  GERENTE: [
    ...LEITURA_BASE, 'clientes:escrever', 'obras:escrever', 'leitura:executar',
    'dimensionamento:executar', 'produtos:escrever', 'orcamento:revisar',
    'orcamento:aprovar', 'orcamento:exportar', 'ia:usar', 'dashboard:executivo', 'aprendizado:ler',
  ],
  ORCAMENTISTA: [
    ...LEITURA_BASE, 'clientes:escrever', 'obras:escrever', 'leitura:executar',
    'dimensionamento:executar', 'orcamento:revisar', 'orcamento:exportar', 'ia:usar', 'aprendizado:ler',
  ],
  COMERCIAL: [...LEITURA_BASE, 'clientes:escrever', 'obras:escrever', 'leitura:executar', 'orcamento:exportar', 'ia:usar'],
  CONSULTA: [...LEITURA_BASE],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
