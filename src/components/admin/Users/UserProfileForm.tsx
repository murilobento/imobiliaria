'use client';

import React, { useState } from 'react';
import { User, Save, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/SupabaseAuthProvider';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';
import { ButtonSpinner } from '@/components/admin/Common/LoadingSpinner';
import { createClient } from '@/lib/supabase-auth';

interface UserProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormData {
  fullName: string;
  username: string;
  email: string;
}

export default function UserProfileForm({ 
  onSuccess, 
  onCancel, 
  isLoading = false 
}: UserProfileFormProps) {
  const { user } = useAuth();
  const { showError, showSuccess } = useErrorContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize Supabase client
  const supabase = createClient();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
    username: user?.email?.split('@')[0] || '',
    email: user?.email || ''
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || isSubmitting || !user) return;

    // Check if there are changes
    const originalFullName = user.user_metadata?.name || user.email?.split('@')[0] || '';
    const originalUsername = user.email?.split('@')[0] || '';
    const originalEmail = user.email || '';
    
    const hasChanges = 
      formData.fullName !== originalFullName ||
      formData.username !== originalUsername ||
      formData.email !== originalEmail;

    if (!hasChanges) {
      showError('Nenhuma alteração', 'Não há alterações para salvar');
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

      // Call API to update user profile
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email
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

      showSuccess('Perfil atualizado', 'Seus dados pessoais foram atualizados com sucesso');
      onSuccess?.();

    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Erro de conexão', 'Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
      username: user?.email?.split('@')[0] || '',
      email: user?.email || ''
    });
    setErrors({});
    onCancel?.();
  };

  if (!user) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">Carregando dados do usuário...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <User className="h-6 w-6 text-blue-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Meus Dados Pessoais
          </h3>
          <p className="text-sm text-gray-600">
            Atualize suas informações pessoais
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name Field */}
        <div>
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
            placeholder="Digite seu nome completo"
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
        <div>
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
            placeholder="Digite seu nome de usuário"
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
        <div>
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
            placeholder="Digite seu email"
            disabled={isLoading || isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading || isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancelar
            </button>
          )}
          
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