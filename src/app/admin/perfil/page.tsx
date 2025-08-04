'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { User, Edit, Shield } from 'lucide-react';
import { useAuth } from '@/components/auth/SupabaseAuthProvider';

import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary';
import { ToastContainer, useToast } from '@/components/admin/Common/Toast';
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner';
import ProfileView from '@/components/user/ProfileView';
import ProfileEditForm from '@/components/user/ProfileEditForm';
import PasswordChangeForm from '@/components/user/PasswordChangeForm';
import Modal from '@/components/admin/Common/Modal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const toast = useToast();

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuthenticated]);

  // Function to load fresh profile data from API
  const loadProfileData = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingProfile(true);
    
    try {
      const { createClient } = await import('@/lib/supabase-auth');
      const supabase = createClient();
      
      // Wait a bit to ensure session is properly initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.log('No valid session available, using auth context data');
        setCurrentUser(user); // Fallback to auth context data
        return;
      }

      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Convert API response to UserType format
          const freshUserData = {
            ...user,
            user_metadata: {
              ...user.user_metadata,
              name: result.data.fullName,
              username: result.data.username,
              role: result.data.role
            }
          };
          setCurrentUser(freshUserData as SupabaseUser);
        } else {
          setCurrentUser(user); // Fallback to auth context data
        }
      } else {
        console.log('API call failed, using auth context data');
        setCurrentUser(user); // Fallback to auth context data
      }
    } catch (error) {
      console.log('Error loading profile data, using auth context data:', error);
      setCurrentUser(user); // Fallback to auth context data
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Load fresh profile data when user is available
  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user, loadProfileData]);

  // Reload profile data when page becomes visible (handles F5/refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadProfileData();
      }
    };

    const handleFocus = () => {
      if (user) {
        loadProfileData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, loadProfileData]);

  // Handle successful profile update
  const handleProfileUpdated = useCallback(async () => {
    // Reload fresh data from API to ensure we have the latest information
    await loadProfileData();
    
    // Force refresh of the auth context to update navbar
    try {
      const { createClient } = await import('@/lib/supabase-auth');
      const supabase = createClient();
      await supabase.auth.refreshSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
    
    setShowEditModal(false);
    toast.showSuccess(
      'Perfil atualizado',
      'Suas informações foram atualizadas com sucesso.'
    );
  }, [toast, loadProfileData]);

  // Handle profile edit cancel
  const handleEditCancel = useCallback(() => {
    setShowEditModal(false);
  }, []);

  // Handle password change success
  const handlePasswordChanged = useCallback(() => {
    setShowPasswordModal(false);
    toast.showSuccess(
      'Senha alterada',
      'Sua senha foi alterada com sucesso.'
    );
  }, [toast]);

  // Handle password change cancel
  const handlePasswordCancel = useCallback(() => {
    setShowPasswordModal(false);
  }, []);

  // Handle edit mode toggle
  const handleEditProfile = useCallback(() => {
    setShowEditModal(true);
  }, []);

  // Handle password modal open
  const handleOpenPasswordModal = useCallback(() => {
    setShowPasswordModal(true);
  }, []);



  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return null;
  }

  // Show loading while authenticating or if no user data
  if (authLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner
          size="lg"
          text="Carregando perfil..."
          showNetworkStatus
        />
      </div>
    );
  }

  return (
    <PageErrorBoundary pageName="Perfil">
      <div className="p-6">
        {/* Page Header - Seguindo padrão das outras páginas */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
              <p className="text-gray-600">Gerencie suas informações pessoais e configurações de segurança</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleEditProfile}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Perfil
              </button>
              
              <button
                onClick={handleOpenPasswordModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                Alterar Senha
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="max-w-4xl">
            {/* Profile View - Always visible */}
            <div className="space-y-6">
              <ProfileView
                user={currentUser}
                onEdit={handleEditProfile}
                isLoading={isLoadingProfile}
              />
              
              {/* Security Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Shield className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Senha</h4>
                      <p className="text-sm text-gray-600">
                        Altere sua senha regularmente para manter sua conta segura
                      </p>
                    </div>
                    <button
                      onClick={handleOpenPasswordModal}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Alterar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={handleEditCancel}
          title="Editar Perfil"
          size="lg"
        >
          <div className="p-1">
            <ProfileEditForm
              user={currentUser}
              onSuccess={handleProfileUpdated}
              onCancel={handleEditCancel}
              isLoading={isLoadingProfile}
            />
          </div>
        </Modal>

        {/* Password Change Modal */}
        <Modal
          isOpen={showPasswordModal}
          onClose={handlePasswordCancel}
          title="Alterar Senha"
          size="lg"
        >
          <div className="p-1">
            <PasswordChangeForm
              onSuccess={handlePasswordChanged}
              onCancel={handlePasswordCancel}
            />
          </div>
        </Modal>

        {/* Toast Container */}
        <ToastContainer 
          toasts={toast.toasts} 
          onRemove={toast.removeToast} 
        />
      </div>
    </PageErrorBoundary>
  );
}