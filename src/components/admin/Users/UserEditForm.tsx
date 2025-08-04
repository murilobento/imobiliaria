'use client';

import React, { useState } from 'react';
import { User, Save, X, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types/auth';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';
import { ButtonSpinner } from '@/components/admin/Common/LoadingSpinner';
import RoleSelector from './RoleSelector';
import type { SupabaseUser as UserType } from '@/lib/auth/supabase-admin';
import { createClient } from '@/lib/supabase-auth';

interface UserEditFormProps {
  user: UserType;
  onSuccess: (updatedUser: UserType) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export default function UserEditForm({ 
  user, 
  onSuccess, 
  onCancel, 
  isLoading = false 
}: UserEditFormProps) {
  const { showError, showSuccess } = useErrorContext();
  const { canManageRole } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize Supabase client
  const supabase = createClient();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: (user as any).user_metadata?.name || user.email?.split('@')[0] || '',
    username: (user as any).username || user.email?.split('@')[0] || '',
    email: user.email || '',
    role: (user.role as UserRole) || 'real-estate-agent',
    is_active: user.is_active
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || isSubmitting) return;

    // Check if there are changes
    const originalFullName = (user as any).user_metadata?.name || user.email?.split('@')[0] || '';
    const originalUsername = (user as any).username || user.email?.split('@')[0] || '';
    const originalEmail = user.email || '';
    
    const hasChanges = 
      formData.fullName !== originalFullName ||
      formData.username !== originalUsername ||
      formData.email !== originalEmail ||
      formData.role !== user.role || 
      formData.is_active !== user.is_active;

    if (!hasChanges) {
      showError('Nenhuma alteração', 'Não há alterações para salvar');
      return;
    }

    // Validate permissions
    if (formData.role !== user.role && !canManageRole(formData.role)) {
      showError('Sem permissão', 'Você não tem permissão para atribuir esta função');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Call API to update user
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
          showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
        } else {
          showError('Erro ao atualizar', result.error || 'Erro desconhecido');
        }
        return;
      }

      showSuccess('Usuário atualizado', 'As informações do usuário foram atualizadas com sucesso');
      onSuccess(result.data);

    } catch (error) {
      console.error('Error updating user:', error);
      showError('Erro de conexão', 'Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.user_metadata?.name || user.email?.split('@')[0] || '',
      username: user.username || user.email?.split('@')[0] || '',
      email: user.email || '',
      role: (user.role as UserRole) || 'real-estate-agent',
      is_active: user.is_active
    });
    setErrors({});
    onCancel();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <User className="h-6 w-6 text-blue-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Editar Usuário
          </h3>
          <p className="text-sm text-gray-600">
            {user.email}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Data Fields */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Dados Pessoais</h4>
          
          {/* Full Name Field */}
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo *
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fullName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite o nome completo"
              disabled={isLoading || isSubmitting}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Username Field */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Nome de usuário *
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.username
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite o nome de usuário"
              disabled={isLoading || isSubmitting}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.username}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite o email"
              disabled={isLoading || isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>
        </div>

        {/* User Info (Read-only) */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Informações do Sistema</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Criado em:</span>
              <span className="ml-2 font-medium">
                {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Último acesso:</span>
              <span className="ml-2 font-medium">
                {user.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')
                  : 'Nunca'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Role Selector */}
        <RoleSelector
          value={formData.role}
          onChange={(role) => setFormData(prev => ({ ...prev, role }))}
          disabled={isLoading || isSubmitting}
          error={errors.role}
        />

        {/* Status Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Status do Usuário
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="is_active"
                checked={formData.is_active === true}
                onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                disabled={isLoading || isSubmitting}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <span className="ml-3 text-sm">
                <span className="font-medium text-green-700">Ativo</span>
                <span className="text-gray-600 block">O usuário pode acessar o sistema</span>
              </span>
            </label>
            
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="is_active"
                checked={formData.is_active === false}
                onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                disabled={isLoading || isSubmitting}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <span className="ml-3 text-sm">
                <span className="font-medium text-red-700">Inativo</span>
                <span className="text-gray-600 block">O usuário não pode acessar o sistema</span>
              </span>
            </label>
          </div>
          
          {errors.is_active && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.is_active}
            </p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading || isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4 mr-2 inline" />
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <ButtonSpinner size="sm" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2 inline" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}