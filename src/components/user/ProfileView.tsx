'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Edit } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileViewProps {
  user: SupabaseUser;
  onEdit: () => void;
  isLoading?: boolean;
}

export default function ProfileView({ user, onEdit, isLoading = false }: ProfileViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const formatDate = (dateString: string) => {
    // Use a more consistent date formatting to avoid hydration mismatches
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">

      <div className="space-y-6">
        {/* Full Name */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <User className="h-5 w-5 text-gray-400 mt-1" />
          </div>
          <div className="ml-3 flex-1">
            <dt className="text-sm font-medium text-gray-500">Nome completo</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">{(user as any).user_metadata?.name || user.email?.split('@')[0] || 'N/A'}</dd>
          </div>
        </div>

        {/* Username */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <User className="h-5 w-5 text-gray-400 mt-1" />
          </div>
          <div className="ml-3 flex-1">
            <dt className="text-sm font-medium text-gray-500">Nome de usuário</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">{(user as any).username || user.email?.split('@')[0] || 'N/A'}</dd>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-gray-400 mt-1" />
          </div>
          <div className="ml-3 flex-1">
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
        </div>

        {/* Created At */}
        {(user as any).created_at && (
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Calendar className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div className="ml-3 flex-1">
              <dt className="text-sm font-medium text-gray-500">Conta criada em</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {isMounted ? formatDate((user as any).created_at) : 'Carregando...'}
              </dd>
            </div>
          </div>
        )}

        {/* Last Login */}
        {(user as any).last_login && (
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Calendar className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div className="ml-3 flex-1">
              <dt className="text-sm font-medium text-gray-500">Último acesso</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {isMounted ? formatDate((user as any).last_login) : 'Carregando...'}
              </dd>
            </div>
          </div>
        )}

        {/* Role */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <User className="h-5 w-5 text-gray-400 mt-1" />
          </div>
          <div className="ml-3 flex-1">
            <dt className="text-sm font-medium text-gray-500">Função</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Administrador
              </span>
            </dd>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`h-5 w-5 mt-1 rounded-full ${(user as any).is_active !== false ? 'bg-green-400' : 'bg-red-400'}`} />
          </div>
          <div className="ml-3 flex-1">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                (user as any).is_active !== false 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {(user as any).is_active !== false ? 'Ativo' : 'Inativo'}
              </span>
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}