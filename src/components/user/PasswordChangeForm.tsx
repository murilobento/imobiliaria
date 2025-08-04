'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Save, X, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { userValidationRules } from '@/types/validation';
import { validatePasswordStrength } from '@/lib/utils/validation';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';
import { ButtonSpinner } from '@/components/admin/Common/LoadingSpinner';
import type { ChangePasswordRequest } from '@/types/auth';

interface PasswordChangeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function PasswordChangeForm({ 
  onSuccess, 
  onCancel, 
  isLoading = false 
}: PasswordChangeFormProps) {
  const { showError, showSuccess } = useErrorContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Initialize form with empty values
  const initialFormData: FormData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
    currentPassword: userValidationRules.currentPassword,
    newPassword: userValidationRules.newPassword,
    confirmPassword: userValidationRules.confirmPassword
  }, {
    validateOnChange: true,
    validateOnBlur: true
  });

  // Password strength validation for new password
  const getPasswordStrengthValidation = (password: string) => {
    if (!password) return { isValid: true, errors: [] };
    
    const errors = validatePasswordStrength(password);
    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  };

  const passwordStrengthValidation = getPasswordStrengthValidation(fields.newPassword.value);

  // Password confirmation validation
  const getPasswordConfirmationValidation = (newPassword: string, confirmPassword: string) => {
    if (!confirmPassword || !newPassword) return { isValid: true, error: null };
    
    return {
      isValid: newPassword === confirmPassword,
      error: newPassword !== confirmPassword ? 'As senhas não coincidem' : null
    };
  };

  const passwordConfirmationValidation = getPasswordConfirmationValidation(
    fields.newPassword.value, 
    fields.confirmPassword.value
  );

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFieldValue(field, value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || isSubmitting) return;

    // Validate all fields
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
      return;
    }

    const formData = getValues();

    // Additional validation for password strength
    if (!passwordStrengthValidation.isValid) {
      setFieldErrors({ newPassword: passwordStrengthValidation.errors });
      showError('Senha fraca', 'A nova senha não atende aos critérios de segurança');
      return;
    }

    // Additional validation for password confirmation
    if (!passwordConfirmationValidation.isValid) {
      setFieldErrors({ confirmPassword: [passwordConfirmationValidation.error!] });
      showError('Erro de confirmação', 'As senhas não coincidem');
      return;
    }

    // Check if new password is different from current password
    if (formData.currentPassword === formData.newPassword) {
      setFieldErrors({ newPassword: ['A nova senha deve ser diferente da senha atual'] });
      showError('Senha inválida', 'A nova senha deve ser diferente da senha atual');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get Supabase session for authentication
      const { createClient } = await import('@/lib/supabase-auth');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        showError('Erro de autenticação', 'Token de acesso não encontrado. Faça login novamente.');
        return;
      }

      // Prepare request data
      const requestData: ChangePasswordRequest = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      };

      // Call API to change password (using Supabase authentication)
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestData),
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
          result.error.details.forEach((error: any) => {
            if (!errorFields[error.field]) {
              errorFields[error.field] = [];
            }
            errorFields[error.field].push(error.message);
          });
          setFieldErrors(errorFields);
          showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
        } else {
          showError('Erro ao alterar senha', result.error?.message || 'Erro interno do servidor');
        }
        return;
      }

      // Success
      resetForm();
      onSuccess();

    } catch (error) {
      console.error('Error changing password:', error);
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
      <div className="flex items-center mb-6">
        <Shield className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Alterar Senha</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password Field */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Senha atual *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPasswords.current ? 'text' : 'password'}
              id="currentPassword"
              value={fields.currentPassword.value}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className={`block w-full pl-10 pr-12 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('currentPassword')
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite sua senha atual"
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => togglePasswordVisibility('current')}
              disabled={isLoading || isSubmitting}
            >
              {showPasswords.current ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          
          {hasFieldError('currentPassword') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('currentPassword')}
            </p>
          )}
        </div>

        {/* New Password Field */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Nova senha *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPasswords.new ? 'text' : 'password'}
              id="newPassword"
              value={fields.newPassword.value}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className={`block w-full pl-10 pr-12 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('newPassword') || !passwordStrengthValidation.isValid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite sua nova senha"
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => togglePasswordVisibility('new')}
              disabled={isLoading || isSubmitting}
            >
              {showPasswords.new ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          
          {/* Password strength validation feedback */}
          {fields.newPassword.value && !passwordStrengthValidation.isValid && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800 mb-2">A senha deve atender aos seguintes critérios:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {passwordStrengthValidation.errors.map((error, index) => (
                  <li key={index} className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {hasFieldError('newPassword') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('newPassword')}
            </p>
          )}
          
          {fields.newPassword.value && passwordStrengthValidation.isValid && !hasFieldError('newPassword') && (
            <p className="mt-1 text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Senha atende aos critérios de segurança
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar nova senha *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              id="confirmPassword"
              value={fields.confirmPassword.value}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`block w-full pl-10 pr-12 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('confirmPassword') || !passwordConfirmationValidation.isValid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Confirme sua nova senha"
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => togglePasswordVisibility('confirm')}
              disabled={isLoading || isSubmitting}
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          
          {/* Password confirmation validation feedback */}
          {fields.confirmPassword.value && !passwordConfirmationValidation.isValid && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {passwordConfirmationValidation.error}
            </p>
          )}
          
          {hasFieldError('confirmPassword') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('confirmPassword')}
            </p>
          )}
          
          {fields.confirmPassword.value && passwordConfirmationValidation.isValid && !hasFieldError('confirmPassword') && (
            <p className="mt-1 text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Senhas coincidem
            </p>
          )}
        </div>

        {/* Password Requirements Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Shield className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">Critérios de segurança para a nova senha:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Pelo menos 8 caracteres</li>
                <li>Pelo menos uma letra minúscula</li>
                <li>Pelo menos uma letra maiúscula</li>
                <li>Pelo menos um número</li>
                <li>Pelo menos um caractere especial (!@#$%^&*)</li>
                <li>Diferente da senha atual</li>
              </ul>
            </div>
          </div>
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
            disabled={
              !isValid || 
              !isDirty || 
              !passwordStrengthValidation.isValid || 
              !passwordConfirmationValidation.isValid ||
              isLoading || 
              isSubmitting
            }
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {(isLoading || isSubmitting) && (
              <>
                <ButtonSpinner size="sm" />
                <span className="ml-2">Alterando...</span>
              </>
            )}
            {!(isLoading || isSubmitting) && (
              <>
                <Save className="h-4 w-4 mr-2" />
                Alterar Senha
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}