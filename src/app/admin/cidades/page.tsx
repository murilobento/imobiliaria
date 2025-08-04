'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { DataTable, Column, Modal, ConfirmDialog, ToastContainer, useToast } from '@/components/admin/Common';
import { Cidade, CreateCidadeData, UpdateCidadeData } from '@/types';
import { fetchCidades, createCidade, updateCidade, deleteCidade } from '@/lib/api/cidades';
import { queryClient, queryKeys } from '@/lib/query/queryClient';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary';

export default function CidadesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [editingCidade, setEditingCidade] = useState<Cidade | null>(null);
  const [deletingCidade, setDeletingCidade] = useState<Cidade | null>(null);
  const [formData, setFormData] = useState<CreateCidadeData>({
    nome: '',
    ativa: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // Remover a declaração não utilizada de queryClient

  // Usar React Query para buscar cidades
  const { data: cidadesData, isLoading } = useQuery({
    queryKey: queryKeys.cidades.list(),
    queryFn: fetchCidades,
    select: (data) => data || []
  });

  // Filtrar cidades com base no termo de busca
  const filteredCidades = cidadesData ? cidadesData.filter((cidade: Cidade) =>
    cidade.nome.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Mutations para operações CRUD
  const createMutation = useMutation({
    mutationFn: createCidade,
    onSuccess: (result: { data?: Cidade; error?: string }) => {
      if (result.error) {
        showError('Erro ao criar cidade', result.error);
      } else {
        showSuccess('Cidade criada com sucesso');
        setIsModalOpen(false);
        // Invalidar cache para recarregar dados
        queryClient.invalidateQueries({ queryKey: queryKeys.cidades.list() });
      }
    },
    onError: () => {
      showError('Erro inesperado', 'Tente novamente mais tarde');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpdateCidadeData> }) =>
      updateCidade(id, data),
    onSuccess: (result: { data?: Cidade; error?: string }) => {
      if (result.error) {
        showError('Erro ao atualizar cidade', result.error);
      } else {
        showSuccess('Cidade atualizada com sucesso');
        setIsModalOpen(false);
        // Invalidar cache para recarregar dados
        queryClient.invalidateQueries({ queryKey: queryKeys.cidades.list() });
      }
    },
    onError: () => {
      showError('Erro inesperado', 'Tente novamente mais tarde');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCidade,
    onSuccess: (result: { data?: { message: string }; error?: string }) => {
      if (result.error) {
        showError('Erro ao excluir cidade', result.error);
      } else {
        showSuccess('Cidade excluída com sucesso');
        setIsConfirmDialogOpen(false);
        setDeletingCidade(null);
        // Invalidar cache para recarregar dados
        queryClient.invalidateQueries({ queryKey: queryKeys.cidades.list() });
      }
    },
    onError: () => {
      showError('Erro inesperado', 'Tente novamente mais tarde');
    }
  });


  const handleCreate = () => {
    setEditingCidade(null);
    setFormData({ nome: '', ativa: true });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (cidade: Cidade) => {
    setEditingCidade(cidade);
    setFormData({
      nome: cidade.nome,
      ativa: cidade.ativa
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (cidade: Cidade) => {
    setDeletingCidade(cidade);
    setIsConfirmDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Nome da cidade é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      errors.nome = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.nome.trim().length > 255) {
      errors.nome = 'Nome deve ter no máximo 255 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (editingCidade) {
      // Update existing city
      const updateData: Partial<UpdateCidadeData> = {
        nome: formData.nome.trim(),
        ativa: formData.ativa
      };

      updateMutation.mutate({ id: editingCidade.id!, data: updateData });
    } else {
      // Create new city
      const createData: CreateCidadeData = {
        nome: formData.nome.trim(),
        ativa: formData.ativa
      };

      createMutation.mutate(createData);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingCidade) return;

    deleteMutation.mutate(deletingCidade.id!);
  };

  const columns: Column<Cidade>[] = [
    {
      key: 'nome',
      title: 'Nome',
      sortable: true,
      searchable: true,
      width: '60%'
    },
    {
      key: 'ativa',
      title: 'Status',
      sortable: true,
      width: '20%',
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Ativa' : 'Inativa'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Criada em',
      sortable: true,
      width: '20%',
      render: (value: string) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('pt-BR');
      }
    }
  ];

  return (
    <PageErrorBoundary pageName="Cidades">
      <PermissionGuard permission="cities.create">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gerenciar Cidades</h1>
                <p className="text-gray-600">{filteredCidades.length} {filteredCidades.length === 1 ? 'cidade encontrada' : 'cidades encontradas'}</p>
              </div>
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Cidade
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar cidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <DataTable
            data={filteredCidades}
            columns={columns}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchable={false}
            emptyMessage="Nenhuma cidade cadastrada"
          />

          {/* Create/Edit Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingCidade ? 'Editar Cidade' : 'Nova Cidade'}
            size="md"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Cidade *
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.nome ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite o nome da cidade"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {formErrors.nome && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.ativa}
                    onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                  <span className="ml-2 text-sm text-gray-700">Cidade ativa</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Cidades inativas não aparecerão no seletor da página principal
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingCidade ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={isConfirmDialogOpen}
            onClose={() => {
              setIsConfirmDialogOpen(false);
              setDeletingCidade(null);
            }}
            onConfirm={handleConfirmDelete}
            title="Excluir Cidade"
            message={`Tem certeza que deseja excluir a cidade "${deletingCidade?.nome}"? Esta ação não pode ser desfeita.`}
            confirmText="Excluir"
            cancelText="Cancelar"
            type="danger"
            loading={deleteMutation.isPending}
          />

          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
      </PermissionGuard>
    </PageErrorBoundary>
  );
}