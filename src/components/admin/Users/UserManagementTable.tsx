'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserCheck, UserX, Eye, AlertTriangle, Edit } from 'lucide-react';
import LoadingSpinner from '../Common/LoadingSpinner';
import ConfirmDialog from '../Common/ConfirmDialog';
import { SupabaseUser as User, UserListResponse } from '@/lib/auth/supabase-admin';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import UserEditForm from './UserEditForm';
import { createClient } from '@/lib/supabase-auth';

interface UserManagementTableProps {
  onUserStatusChange?: (user: User) => void;
  className?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default function UserManagementTable({ 
  onUserStatusChange,
  className = '' 
}: UserManagementTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    user: User | null;
    action: 'activate' | 'deactivate';
    loading: boolean;
  }>({
    isOpen: false,
    user: null,
    action: 'activate',
    loading: false
  });

  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Get permissions
  const { canManageUsers } = usePermissions();
  
  // Initialize Supabase client
  const supabase = createClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      const result: ApiResponse<UserListResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success && result.data) {
        setUsers(result.data.users);
        setTotalUsers(result.data.total);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm]);

  // Load users on component mount and when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle user status toggle
  const handleStatusToggle = (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    setConfirmDialog({
      isOpen: true,
      user,
      action,
      loading: false
    });
  };

  // Confirm status change
  const confirmStatusChange = async () => {
    if (!confirmDialog.user) return;

    try {
      setConfirmDialog(prev => ({ ...prev, loading: true }));

      const newStatus = !confirmDialog.user.is_active;
      
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/users/${confirmDialog.user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          is_active: newStatus
        }),
      });

      const result: ApiResponse<User> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.success && result.data) {
        // Update the user in the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === result.data!.id ? result.data! : user
          )
        );

        // Call the callback if provided
        onUserStatusChange?.(result.data);

        // Close dialog
        setConfirmDialog({
          isOpen: false,
          user: null,
          action: 'activate',
          loading: false
        });
      } else {
        throw new Error(result.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user status');
      setConfirmDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    if (!confirmDialog.loading) {
      setConfirmDialog({
        isOpen: false,
        user: null,
        action: 'activate',
        loading: false
      });
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalUsers / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalUsers);

  return (
    <div className={`bg-white shadow-sm rounded-lg ${className}`}>
      {/* Header with search */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            Usuários Cadastrados
          </h3>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Função
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <LoadingSpinner text="Carregando usuários..." />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {debouncedSearchTerm 
                    ? `Nenhum usuário encontrado para "${debouncedSearchTerm}"`
                    : 'Nenhum usuário cadastrado'
                  }
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {canManageUsers && (
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          title="Editar usuário"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleStatusToggle(user)}
                        className={`p-2 rounded-md transition-colors ${
                          user.is_active
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={user.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {user.is_active ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalUsers > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <span>Mostrando</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>de {totalUsers} usuários</span>
            {totalUsers > 0 && (
              <span className="text-gray-500">
                ({startItem}-{endItem})
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmStatusChange}
        title={`${confirmDialog.action === 'activate' ? 'Ativar' : 'Desativar'} Usuário`}
        message={
          confirmDialog.user
            ? `Tem certeza que deseja ${
                confirmDialog.action === 'activate' ? 'ativar' : 'desativar'
              } o usuário "${confirmDialog.user.email}"?`
            : ''
        }
        confirmText={confirmDialog.action === 'activate' ? 'Ativar' : 'Desativar'}
        cancelText="Cancelar"
        type={confirmDialog.action === 'activate' ? 'info' : 'warning'}
        loading={confirmDialog.loading}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <UserEditForm
              user={editingUser}
              onSuccess={(updatedUser) => {
                // Update the user in the local state
                setUsers(prevUsers => 
                  prevUsers.map(user => 
                    user.id === updatedUser.id ? updatedUser : user
                  )
                );
                setEditingUser(null);
                // Call the callback if provided
                onUserStatusChange?.(updatedUser);
              }}
              onCancel={() => setEditingUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}