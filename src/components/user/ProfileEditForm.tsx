'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { profileUpdateValidationRules } from '@/types/validation';
import { validateUpdateProfile, validateUsernameFormat } from '@/lib/utils/validation';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';
import { ButtonSpinner } from '@/components/admin/Common/LoadingSpinner';
import type { UpdateProfileRequest } from '@/types/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileEditFormProps {
  user: SupabaseUser;
  onSuccess: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  fullName: string;
  username: string;
  email: string;
}

export default function ProfileEditForm({ 
  user, 
  onSuccess, 
  onCancel, 
  isLoading = false 
}: ProfileEditFormProps) {
  const { showError, showSuccess } = useErrorContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with current user data
  const initialFormData: FormData = {
    fullName: user?.user_metadata?.name || user.email?.split('@')[0] || '',
    username: (user as any).username || user.email?.split('@')[0] || '',
    email: user.email || ''
  };

  // Form validation hook
  const {
    fields,
    isValid,
    isDirty,
    setFieldValue,
    setFieldErrors,
    validateAllFields,
    getValues,
    hasFieldError,
    getFieldError,
    resetForm
  } = useFormValidation(initialFormData, {
    fullName: profileUpdateValidationRules.fullName,
    username: profileUpdateValidationRules.username,
    email: profileUpdateValidationRules.email
  }, {
    validateOnChange: true,
    validateOnBlur: true,
    sanitizeOnChange: false // Desabilitar sanitização automática para permitir espaços
  });

  // Real-time username validation
  const getUsernameValidation = (username: string) => {
    const currentUsername = (user as any).username || user.email?.split('@')[0] || '';
    if (!username || username === currentUsername) return { isValid: true, errors: [] };
    
    const errors = validateUsernameFormat(username);
    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  };

  const usernameValidation = getUsernameValidation(fields.username.value);

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFieldValue(field, value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || isSubmitting) return;

    // Check if form has changes
    if (!isDirty) {
      showError('Nenhuma alteração', 'Não há alterações para salvar');
      return;
    }

    // Validate all fields
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
      return;
    }

    const formData = getValues();

    // Prepare update data (only include changed fields)
    const currentFullName = user?.user_metadata?.name || user.email?.split('@')[0] || '';
    const currentUsername = (user as any).username || user.email?.split('@')[0] || '';
    const updateData: UpdateProfileRequest = {};
    
    if (formData.fullName !== currentFullName) {
      updateData.fullName = formData.fullName;
    }
    if (formData.username !== currentUsername) {
      updateData.username = formData.username;
    }
    if (formData.email !== user.email) {
      updateData.email = formData.email;
    }

    // Additional validation
    const validation = validateUpdateProfile(updateData, user.id);
    if (!validation.isValid) {
      const errorFields: Record<string, string[]> = {};
      validation.errors.forEach(error => {
        if (!errorFields[error.field]) {
          errorFields[error.field] = [];
        }
        errorFields[error.field].push(error.message);
      });
      setFieldErrors(errorFields);
      showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get Supabase session for authentication
      const { createClient } = await import('@/lib/supabase-auth');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        showError('Erro de autenticação', 'Sessão expirada. Faça login novamente.');
        return;
      }

      // Call API to update profile (using Supabase authentication)
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.field) {
          // Field-specific error
          setFieldErrors({ [result.error.field]: [result.error.message] });
          showError('Erro de validação', result.error.message);
        } else if (result.error?.details) {
          // Multiple validation errors
          const errorFields: Record<string, string[]> = {};
          Object.entries(result.error.details).forEach(([field, errors]) => {
            errorFields[field] = errors as string[];
          });
          setFieldErrors(errorFields);
          showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
        } else {
          showError('Erro ao atualizar perfil', result.error?.message || 'Erro interno do servidor');
        }
        return;
      }

      // Success - don't show message here, let the parent component handle it
      onSuccess();

    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Erro de conexão', 'Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name Field */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="fullName"
              value={fields.fullName.value}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('fullName')
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite seu nome completo"
              disabled={isLoading || isSubmitting}
            />
          </div>
          
          {hasFieldError('fullName') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('fullName')}
            </p>
          )}
        </div>

        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Nome de usuário *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="username"
              value={fields.username.value}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('username')
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite o nome de usuário"
              disabled={isLoading || isSubmitting}
            />
          </div>
          
          {/* Username validation feedback */}
          {fields.username.value !== ((user as any).username || user.email?.split('@')[0] || '') && !usernameValidation.isValid && (
            <div className="mt-1 text-sm text-red-600">
              <ul className="list-disc list-inside space-y-1">
                {usernameValidation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {hasFieldError('username') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('username')}
            </p>
          )}
          
          {fields.username.value !== ((user as any).username || user.email?.split('@')[0] || '') && usernameValidation.isValid && !hasFieldError('username') && (
            <p className="mt-1 text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Nome de usuário válido
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              value={fields.email.value}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('email')
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite o email"
              disabled={isLoading || isSubmitting}
            />
          </div>
          
          {hasFieldError('email') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('email')}
            </p>
          )}

          {fields.email.value !== user.email && !hasFieldError('email') && (
            <p className="mt-1 text-sm text-blue-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Email será atualizado
            </p>
          )}
        </div>

        {/* Change indicator */}
        {isDirty && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Alterações detectadas</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  {fields.fullName.value !== (user?.user_metadata?.name || user.email?.split('@')[0] || '') && (
                    <li>Nome completo será alterado para: <strong>{fields.fullName.value}</strong></li>
                  )}
                  {fields.username.value !== ((user as any).username || user.email?.split('@')[0] || '') && (
                    <li>Nome de usuário será alterado para: <strong>{fields.username.value}</strong></li>
                  )}
                  {fields.email.value !== user.email && (
                    <li>Email será alterado para: <strong>{fields.email.value}</strong></li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

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
            disabled={!isValid || !isDirty || isLoading || isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {(isLoading || isSubmitting) && (
              <>
                <ButtonSpinner size="sm" />
                <span className="ml-2">Salvando...</span>
              </>
            )}
            {!(isLoading || isSubmitting) && (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}