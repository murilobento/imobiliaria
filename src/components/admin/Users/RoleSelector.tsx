'use client';

import React from 'react';
import { Shield, Info } from 'lucide-react';
import { UserRole } from '@/types/auth';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/auth/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  error?: string;
  showDescriptions?: boolean;
}

export default function RoleSelector({ 
  value, 
  onChange, 
  disabled = false, 
  error,
  showDescriptions = true 
}: RoleSelectorProps) {
  const { assignableRoles, canManageRole } = usePermissions();

  // Se o usuário não pode gerenciar roles, não mostra o seletor
  if (assignableRoles.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Função
        </label>
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <Shield className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">
            {ROLE_LABELS[value] || 'Função não definida'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
        Função *
      </label>
      
      <div className="space-y-3">
        {assignableRoles.map((role) => (
          <div key={role} className="relative">
            <label className="flex items-start cursor-pointer">
              <input
                type="radio"
                name="role"
                value={role}
                checked={value === role}
                onChange={(e) => onChange(e.target.value as UserRole)}
                disabled={disabled || !canManageRole(role)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                
                {showDescriptions && (
                  <div className="mt-1 flex items-start">
                    <Info className="h-3 w-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <Info className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {assignableRoles.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          Você não tem permissão para alterar funções de usuário.
        </p>
      )}
    </div>
  );
}