'use client';

import React, { useState, useCallback } from 'react';
import { Users, Plus } from 'lucide-react';
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs';
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary';
import { ToastContainer, useToast } from '@/components/admin/Common/Toast';
import UserRegistrationForm from '@/components/admin/Users/UserRegistrationForm';
import UserManagementTable from '@/components/admin/Users/UserManagementTable';
import Modal from '@/components/admin/Common/Modal';
import PermissionGuard from '@/components/auth/PermissionGuard';
import type { SupabaseUser as User } from '@/lib/auth/supabase-admin';

export default function UsuariosPage() {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [refreshTable, setRefreshTable] = useState(0);
  const toast = useToast();

  // Handle successful user creation
  const handleUserCreated = useCallback((user: User) => {
    // Refresh the table to show the new user
    setRefreshTable(prev => prev + 1);
    
    // Close modal
    setShowRegistrationModal(false);
    
    toast.showSuccess(
      'Usuário criado com sucesso',
      `O usuário ${user.email} foi criado e está ativo no sistema.`
    );
  }, [toast]);

  // Handle user status changes
  const handleUserStatusChange = useCallback((user: User) => {
    const statusText = user.is_active ? 'ativado' : 'desativado';
    toast.showSuccess(
      'Status atualizado',
      `O usuário ${user.email} foi ${statusText} com sucesso.`
    );
  }, [toast]);

  // Handle modal registration
  const handleOpenRegistrationModal = () => {
    setShowRegistrationModal(true);
  };

  const handleCloseRegistrationModal = () => {
    setShowRegistrationModal(false);
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Usuários', current: true }
  ];

  return (
    <PageErrorBoundary pageName="Usuários">
      <PermissionGuard permission="users.view">
        <div className="p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gerenciamento de Usuários
                </h1>
                <p className="text-gray-600 mt-1">
                  Cadastre novos usuários e gerencie permissões de acesso ao sistema
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center">
              <PermissionGuard permission="users.create" showError={false}>
                <button
                  onClick={handleOpenRegistrationModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </button>
              </PermissionGuard>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div>
            <UserManagementTable
              key={refreshTable} // Force re-render when refreshTable changes
              onUserStatusChange={handleUserStatusChange}
              className="shadow-sm"
            />
          </div>
        </div>

        {/* Registration Modal (for quick access from list view) */}
        <Modal
          isOpen={showRegistrationModal}
          onClose={handleCloseRegistrationModal}
          title="Cadastrar Novo Usuário"
          size="lg"
        >
          <div className="p-1">
            <UserRegistrationForm
              onSuccess={handleUserCreated}
              onCancel={handleCloseRegistrationModal}
            />
          </div>
        </Modal>

        {/* Toast Container */}
        <ToastContainer 
          toasts={toast.toasts} 
          onRemove={toast.removeToast} 
        />
        </div>
      </PermissionGuard>
    </PageErrorBoundary>
  );
}