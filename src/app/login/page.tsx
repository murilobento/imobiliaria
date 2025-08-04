'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/SupabaseAuthProvider';
import { SupabaseLoginForm } from '@/components/auth/SupabaseLoginForm';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const isAuthenticated = !!user;
  const isLoading = loading;

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  // Update document title for SEO - SEMPRE executar este hook
  useEffect(() => {
    document.title = 'Login - Painel Administrativo | JR Imóveis';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Acesse o painel administrativo do sistema de gestão imobiliária JR Imóveis. Login seguro para administradores.');
    }
    
    // Add robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow');
  }, []);

  const handleLoginSuccess = () => {
    router.push('/admin');
  };

  // Show loading while checking authentication status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <svg 
            className="animate-spin h-8 w-8 text-blue-600" 
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
          <span className="text-gray-600">Verificando autenticação...</span>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated (prevents flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Painel Administrativo
          </h1>
          <p className="text-sm text-gray-600">
            Faça login para acessar o sistema
          </p>
        </header>

        {/* Login Form Card */}
        <section 
          className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200"
          aria-labelledby="login-heading"
        >
          <h2 id="login-heading" className="sr-only">
            Formulário de Login
          </h2>
          <SupabaseLoginForm 
            onSuccess={handleLoginSuccess}
            className="w-full"
          />
        </section>

        {/* Footer */}
        <footer className="text-center">
          <p className="text-xs text-gray-500">
            Sistema de Gestão Imobiliária
          </p>
        </footer>
      </div>
    </div>
  );
}