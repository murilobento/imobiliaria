/**
 * Hook para gerenciamento de permissões
 */

import { useAuth } from '@/components/auth/SupabaseAuthProvider';
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canManageRole,
  getAssignableRoles
} from '@/lib/auth/permissions';
import { UserRole } from '@/types/auth';

export function usePermissions() {
  const { user } = useAuth();



  // Garantir que userRole seja sempre uma role válida
  // Primeiro tenta pegar do user_metadata, depois do campo direto
  const rawRole = (user as any)?.user_metadata?.role || (user as any)?.role;
  const userRole: UserRole = (rawRole === 'admin' || rawRole === 'real-estate-agent')
    ? rawRole
    : 'real-estate-agent'; // Default para corretor



  return {
    // Verificações de permissão
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),

    // Informações da role
    userRole,
    rolePermissions: getRolePermissions(userRole),

    // Gerenciamento de roles (para admins)
    canManageRole: (targetRole: UserRole) => canManageRole(userRole, targetRole),
    assignableRoles: getAssignableRoles(userRole),

    // Verificações específicas comuns
    isAdmin: userRole === 'admin',
    isRealEstateAgent: userRole === 'real-estate-agent',

    // Verificações de acesso a seções
    canAccessUsers: hasPermission(userRole, 'users.view'),
    canManageUsers: hasPermission(userRole, 'users.manage_roles'),
    canAccessProperties: hasPermission(userRole, 'properties.view'),
    canAccessClients: hasPermission(userRole, 'clients.view'),
    canAccessCities: hasPermission(userRole, 'cities.view'),
    canManageCities: hasPermission(userRole, 'cities.create'),
    canAccessReports: hasPermission(userRole, 'reports.view'),
    canAccessSystem: hasPermission(userRole, 'system.admin'),
  };
}