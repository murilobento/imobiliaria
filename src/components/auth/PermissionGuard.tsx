'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/auth/permissions';
import { AlertTriangle, Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // Se true, requer todas as permissões. Se false, requer pelo menos uma
  fallback?: React.ReactNode;
  showError?: boolean;
}

export default function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  showError = true
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, userRole } = usePermissions();

  // Determinar quais permissões verificar
  const permissionsToCheck = permission ? [permission] : permissions;

  // Verificar se o usuário tem as permissões necessárias
  let hasAccess = false;
  
  if (permissionsToCheck.length === 0) {
    // Se nenhuma permissão especificada, permitir acesso
    hasAccess = true;
  } else if (requireAll) {
    // Requer todas as permissões
    hasAccess = hasAllPermissions(permissionsToCheck);
  } else {
    // Requer pelo menos uma permissão
    hasAccess = hasAnyPermission(permissionsToCheck);
  }

  // Se tem acesso, renderizar o conteúdo
  if (hasAccess) {
    return <>{children}</>;
  }

  // Se tem fallback customizado, usar ele
  if (fallback) {
    return <>{fallback}</>;
  }

  // Se não deve mostrar erro, não renderizar nada
  if (!showError) {
    return null;
  }

  // Renderizar mensagem de erro padrão
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Acesso Negado
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Você não tem permissão para acessar esta funcionalidade.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Permissões necessárias:</p>
              <ul className="list-disc list-inside space-y-1">
                {permissionsToCheck.map((perm, index) => (
                  <li key={index} className="text-xs">
                    {perm.replace(/\./g, ' › ').replace(/([a-z])([A-Z])/g, '$1 $2')}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Sua função atual: <strong>{userRole}</strong>
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}