'use client';

import React, { useState } from 'react';
import { User, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { userValidationRules } from '@/types/validation';
import { validateCreateUser, validatePasswordStrength, validateUsernameFormat } from '@/lib/utils/validation';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';
import { ButtonSpinner } from '@/components/admin/Common/LoadingSpinner';
import type { SupabaseUser as UserType } from '@/lib/auth/supabase-admin';
import { UserRole } from '@/types/auth';
import RoleSelector from './RoleSelector';
import { createClient } from '@/lib/supabase-auth';

interface UserRegistrationFormProps {
  onSuccess: (user: UserType) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

const initialFormData: FormData = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'real-estate-agent' // Default para corretor
};

export default function UserRegistrationForm({ 
  onSuccess, 
  onCancel, 
  isLoading = false 
}: UserRegistrationFormProps) {
  const { showError, showSuccess } = useErrorContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize Supabase client
  const supabase = createClient();

  // Form validation hook
  const {
    fields,
    isValid,
    setFieldValue,
    setFieldErrors,
    validateAllFields,
    getValues,
    hasFieldError,
    getFieldError,
    resetForm
  } = useFormValidation(initialFormData, {
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
      message: 'Nome deve conter apenas letras e espaços'
    },
    username: userValidationRules.username,
    email: userValidationRules.email,
    password: userValidationRules.password,
    confirmPassword: userValidationRules.confirmPassword
  }, {
    validateOnChange: true,
    validateOnBlur: true
  });

  // Real-time password strength validation
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, feedback: [] };
    
    const errors = validatePasswordStrength(password);
    const score = Math.max(0, 5 - errors.length);
    
    return {
      score,
      feedback: errors.map(e => e.message)
    };
  };

  const passwordStrength = getPasswordStrength(fields.password.value);

  // Real-time username validation
  const getUsernameValidation = (username: string) => {
    if (!username) return { isValid: true, errors: [] };
    
    const errors = validateUsernameFormat(username);
    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  };

  const usernameValidation = getUsernameValidation(fields.username.value);

  // Handle input changes with real-time validation
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFieldValue(field, value);

    // Custom validation for confirm password
    if (field === 'confirmPassword' || field === 'password') {
      const currentPassword = field === 'password' ? value : fields.password.value;
      const currentConfirmPassword = field === 'confirmPassword' ? value : fields.confirmPassword.value;
      
      if (currentConfirmPassword && currentPassword !== currentConfirmPassword) {
        setFieldErrors({ confirmPassword: ['As senhas não coincidem'] });
      }
    }
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

    // Additional validation
    const validation = validateCreateUser(formData);
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
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Call API to create user
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.field) {
          // Field-specific error
          setFieldErrors({ [result.field]: [result.error] });
          showError('Erro de validação', result.error);
        } else if (result.errors) {
          // Multiple validation errors
          const errorFields: Record<string, string[]> = {};
          result.errors.forEach((error: any) => {
            if (!errorFields[error.field]) {
              errorFields[error.field] = [];
            }
            errorFields[error.field].push(error.message);
          });
          setFieldErrors(errorFields);
          showError('Erro de validação', 'Por favor, corrija os erros nos campos indicados');
        } else {
          showError('Erro ao criar usuário', result.error || 'Erro interno do servidor');
        }
        return;
      }

      // Success
      showSuccess('Usuário criado com sucesso', `O usuário ${result.data.email} foi criado com sucesso`);
      resetForm();
      onSuccess(result.data);

    } catch (error) {
      console.error('Error creating user:', error);
      showError('Erro de conexão', 'Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel?.();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <UserPlus className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Cadastrar Novo Usuário</h2>
      </div>

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
              placeholder="Digite o nome completo"
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
          {fields.username.value && !usernameValidation.isValid && (
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
          
          {fields.username.value && usernameValidation.isValid && !hasFieldError('username') && (
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
          <input
            type="email"
            id="email"
            value={fields.email.value}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('email')
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="Digite o email"
            disabled={isLoading || isSubmitting}
          />
          
          {hasFieldError('email') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('email')}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={fields.password.value}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('password')
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Digite a senha"
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          
          {/* Password strength indicator */}
          {fields.password.value && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.score <= 1
                          ? 'bg-red-500'
                          : passwordStrength.score <= 3
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {passwordStrength.score <= 1
                    ? 'Fraca'
                    : passwordStrength.score <= 3
                    ? 'Média'
                    : 'Forte'}
                </span>
              </div>
              
              {passwordStrength.feedback.length > 0 && (
                <div className="mt-1 text-xs text-gray-600">
                  <ul className="list-disc list-inside space-y-1">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <li key={index}>{feedback}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {hasFieldError('password') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('password')}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar senha *
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={fields.confirmPassword.value}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('confirmPassword')
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Confirme a senha"
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          
          {/* Password match indicator */}
          {fields.confirmPassword.value && (
            <div className="mt-1">
              {fields.password.value === fields.confirmPassword.value ? (
                <p className="text-sm text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  As senhas coincidem
                </p>
              ) : (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  As senhas não coincidem
                </p>
              )}
            </div>
          )}
          
          {hasFieldError('confirmPassword') && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {getFieldError('confirmPassword')}
            </p>
          )}
        </div>

        {/* Role Selector */}
        <RoleSelector
          value={fields.role.value}
          onChange={(role) => handleInputChange('role', role)}
          disabled={isLoading || isSubmitting}
          error={hasFieldError('role') ? getFieldError('role') : undefined}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading || isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          )}
          
          <button
            type="submit"
            disabled={!isValid || isLoading || isSubmitting || passwordStrength.score < 3}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {(isLoading || isSubmitting) && (
              <>
                <ButtonSpinner size="sm" />
                <span className="ml-2">Criando usuário...</span>
              </>
            )}
            {!(isLoading || isSubmitting) && (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Usuário
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}