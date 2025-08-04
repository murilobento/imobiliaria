/**
 * Sistema de Permissões por Role
 */

import { UserRole } from '@/types/auth';

// Definição das permissões disponíveis no sistema
export type Permission =
  // Usuários
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage_roles'

  // Imóveis
  | 'properties.view'
  | 'properties.create'
  | 'properties.edit'
  | 'properties.delete'

  // Clientes
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'

  // Cidades
  | 'cities.view'
  | 'cities.create'
  | 'cities.edit'
  | 'cities.delete'

  // Perfil
  | 'profile.view'
  | 'profile.edit'

  // Dashboard/Relatórios
  | 'dashboard.view'
  | 'reports.view'

  // Financeiro - Contratos
  | 'financial.contracts.view'
  | 'financial.contracts.create'
  | 'financial.contracts.edit'
  | 'financial.contracts.delete'

  // Financeiro - Pagamentos
  | 'financial.payments.view'
  | 'financial.payments.create'
  | 'financial.payments.edit'
  | 'financial.payments.delete'
  | 'financial.payments.process'

  // Financeiro - Despesas
  | 'financial.expenses.view'
  | 'financial.expenses.create'
  | 'financial.expenses.edit'
  | 'financial.expenses.delete'

  // Financeiro - Relatórios
  | 'financial.reports.view'
  | 'financial.reports.export'

  // Financeiro - Configurações
  | 'financial.settings.view'
  | 'financial.settings.edit'

  // Auditoria
  | 'audit.logs.view'

  // Sistema
  | 'system.admin';

// Mapeamento de permissões por role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Acesso irrestrito - todas as permissões
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage_roles',
    'properties.view',
    'properties.create',
    'properties.edit',
    'properties.delete',
    'clients.view',
    'clients.create',
    'clients.edit',
    'clients.delete',
    'cities.view',
    'cities.create',
    'cities.edit',
    'cities.delete',
    'profile.view',
    'profile.edit',
    'dashboard.view',
    'reports.view',
    'financial.contracts.view',
    'financial.contracts.create',
    'financial.contracts.edit',
    'financial.contracts.delete',
    'financial.payments.view',
    'financial.payments.create',
    'financial.payments.edit',
    'financial.payments.delete',
    'financial.payments.process',
    'financial.expenses.view',
    'financial.expenses.create',
    'financial.expenses.edit',
    'financial.expenses.delete',
    'financial.reports.view',
    'financial.reports.export',
    'financial.settings.view',
    'financial.settings.edit',
    'audit.logs.view',
    'system.admin'
  ],

  'real-estate-agent': [
    // Corretor de imóveis - acesso limitado
    'properties.view',
    'properties.create',
    'properties.edit',
    'properties.delete',
    'clients.view',
    'clients.create',
    'clients.edit',
    'clients.delete',
    'cities.view', // Apenas visualizar cidades
    'profile.view',
    'profile.edit',
    'dashboard.view',
    'financial.contracts.view',
    'financial.contracts.create',
    'financial.contracts.edit',
    'financial.payments.view',
    'financial.payments.create',
    'financial.payments.edit',
    'financial.expenses.view',
    'financial.expenses.create',
    'financial.expenses.edit',
    'financial.reports.view',
    'financial.settings.view'
  ]
};

// Labels amigáveis para as roles
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  'real-estate-agent': 'Corretor de Imóveis'
};

// Descrições das roles
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acesso completo ao sistema, incluindo gerenciamento de usuários e configurações',
  'real-estate-agent': 'Acesso para cadastro e gerenciamento de imóveis e clientes'
};

/**
 * Verifica se um usuário tem uma permissão específica
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  if (!userRole || !permission) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions || !Array.isArray(rolePermissions)) {
    return false;
  }

  return rolePermissions.includes(permission);
}

/**
 * Verifica se um usuário tem pelo menos uma das permissões especificadas
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  if (!userRole || !permissions || !Array.isArray(permissions)) {
    return false;
  }
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Verifica se um usuário tem todas as permissões especificadas
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  if (!userRole || !permissions || !Array.isArray(permissions)) {
    return false;
  }
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Obtém todas as permissões de uma role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  if (!role) {
    return [];
  }
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Verifica se uma role pode gerenciar outra role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  if (!managerRole || !targetRole) {
    return false;
  }

  // Apenas admin pode gerenciar roles
  if (managerRole !== 'admin') {
    return false;
  }

  // Admin pode gerenciar qualquer role
  return true;
}

/**
 * Obtém as roles que um usuário pode atribuir a outros
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  if (!userRole) {
    return [];
  }

  if (userRole === 'admin') {
    return ['admin', 'real-estate-agent'];
  }

  return []; // Outras roles não podem atribuir roles
}