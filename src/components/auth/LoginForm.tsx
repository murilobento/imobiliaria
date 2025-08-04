'use client';

import React, { useState, useReducer } from 'react';
import { useForm } from 'react-hook-form';
import { LoginFormData } from '@/types/auth';
import { useAuth } from './AuthProvider';

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

// Reducer para controlar o estado de erro de forma mais robusta
interface ErrorState {
  error: string;
  timestamp: number;
}

type ErrorAction = 
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  console.log('🔍 [ERROR REDUCER] Action:', action.type, action.type === 'SET_ERROR' ? action.payload : '');
  
  switch (action.type) {
    case 'SET_ERROR':
      return { error: action.payload, timestamp: Date.now() };
    case 'CLEAR_ERROR':
      return { error: '', timestamp: Date.now() };
    default:
      return state;
  }
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, className = '' }) => {
  const { login, isLoading } = useAuth();
  const [errorState, dispatchError] = useReducer(errorReducer, { error: '', timestamp: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Debug: Monitorar mudanças no estado de erro
  React.useEffect(() => {
    console.log('🔍 [LOGIN FORM EFFECT] errorState changed to:', errorState);
  }, [errorState]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<LoginFormData>({
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (isSubmitting || isLoading) return;

    setIsSubmitting(true);
    // NÃO limpar o submitError aqui - pode estar causando o problema
    // setSubmitError('');

    try {
      await login(data.username, data.password);
      reset();
      onSuccess?.();
    } catch (error) {
      console.log('🔍 [LOGIN FORM DEBUG] Error caught:', error);
      let errorMessage = 'Erro ao fazer login';
      
      if (error instanceof Error) {
        console.log('🔍 [LOGIN FORM DEBUG] Error message:', error.message);
        // Traduzir mensagens de erro para português
        switch (error.message) {
          case 'RATE_LIMITED':
            errorMessage = 'Muitas tentativas de login. Tente novamente em alguns minutos.';
            break;
          case 'Invalid credentials':
            errorMessage = 'Usuário ou senha incorretos.';
            break;
          case 'Username is required':
            errorMessage = 'Nome de usuário é obrigatório.';
            break;
          case 'Password is required':
            errorMessage = 'Senha é obrigatória.';
            break;
          case 'Account is temporarily locked due to too many failed attempts':
            errorMessage = 'Conta temporariamente bloqueada devido a muitas tentativas falhadas.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      console.log('🔍 [LOGIN FORM DEBUG] Setting error message:', errorMessage);
      console.log('🔍 [LOGIN FORM DEBUG] About to dispatch SET_ERROR with:', errorMessage);
      
      // Usar o reducer para definir o erro
      dispatchError({ type: 'SET_ERROR', payload: errorMessage });
      
      console.log('🔍 [LOGIN FORM DEBUG] dispatchError called');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  // Debug log para verificar o estado do erro
  console.log('🔍 [LOGIN FORM RENDER] errorState:', errorState);
  console.log('🔍 [LOGIN FORM RENDER] errorState.error truthy?', !!errorState.error);

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate role="form">
        {/* Username Field */}
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Usuário
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            disabled={isFormLoading}
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${errors.username 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300'
              }
            `}
            placeholder="Digite seu usuário"
            {...register('username', {
              required: 'Usuário é obrigatório',
              minLength: {
                value: 2,
                message: 'Usuário deve ter pelo menos 2 caracteres',
              },
              maxLength: {
                value: 50,
                message: 'Usuário deve ter no máximo 50 caracteres',
              },
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message: 'Usuário deve conter apenas letras, números, _ ou -',
              },
            })}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isFormLoading}
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${errors.password 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300'
              }
            `}
            placeholder="Digite sua senha"
            {...register('password', {
              required: 'Senha é obrigatória',
              minLength: {
                value: 1,
                message: 'Senha é obrigatória',
              },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Error - Debug version */}
        <div style={{ display: errorState.error ? 'block' : 'none' }} className="rounded-md bg-red-50 p-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-red-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erro no login
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorState.error || 'Erro desconhecido'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Debug info */}
        <div className="text-xs text-gray-500">
          Debug: errorState.error = &quot;{errorState.error}&quot;, timestamp = {errorState.timestamp}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={!isValid || isFormLoading}
            className={`
              w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
              shadow-sm text-sm font-medium text-white
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-200
              ${!isValid || isFormLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }
            `}
          >
            {isFormLoading ? (
              <div className="flex items-center">
                <svg 
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Entrando...
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;