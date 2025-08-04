'use client';

import { useState, useEffect } from 'react';
import { Plus, User, DollarSign } from 'lucide-react';
import Link from 'next/link';
import DataTable, { Column } from '@/components/admin/Common/DataTable';
import Modal from '@/components/admin/Common/Modal';
import ConfirmDialog from '@/components/admin/Common/ConfirmDialog';
import { ToastContainer, useToast } from '@/components/admin/Common/Toast';
import { PageLoader } from '@/components/admin/Common/PageLoader';
import { Cliente } from '@/types/cliente';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary';
import ContratosAtivos from '@/components/admin/Common/ContratosAtivos';
import ClienteContratosCell from '@/components/admin/Common/ClienteContratosCell';
import { useClienteActiveContracts } from '@/hooks/useRentalStatus';

// Client form component
interface ClienteFormProps {
  cliente?: Cliente;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function ClienteForm({ cliente, onSubmit, onCancel, loading = false }: ClienteFormProps) {
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    email: cliente?.email || '',
    telefone: cliente?.telefone || '',
    cpf_cnpj: cliente?.cpf_cnpj || '',
    endereco: cliente?.endereco || '',
    observacoes: cliente?.observacoes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    if (formData.telefone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone)) {
      newErrors.telefone = 'Telefone deve estar no formato (XX) XXXXX-XXXX';
    }

    if (formData.cpf_cnpj && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cpf_cnpj)) {
      newErrors.cpf_cnpj = 'CPF/CNPJ deve estar no formato XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome *
        </label>
        <input
          type="text"
          id="nome"
          value={formData.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.nome ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Digite o nome do cliente"
        />
        {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Digite o email do cliente"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
          Telefone
        </label>
        <input
          type="text"
          id="telefone"
          value={formData.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.telefone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="(XX) XXXXX-XXXX"
        />
        {errors.telefone && <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>}
      </div>

      <div>
        <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-700 mb-1">
          CPF/CNPJ
        </label>
        <input
          type="text"
          id="cpf_cnpj"
          value={formData.cpf_cnpj}
          onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.cpf_cnpj ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX"
        />
        {errors.cpf_cnpj && <p className="mt-1 text-sm text-red-600">{errors.cpf_cnpj}</p>}
      </div>

      <div>
        <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
          Endereço
        </label>
        <textarea
          id="endereco"
          value={formData.endereco}
          onChange={(e) => handleChange('endereco', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Digite o endereço completo"
        />
      </div>

      <div>
        <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Observações adicionais sobre o cliente"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : cliente ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const toast = useToast();

  // Load clientes
  const loadClientes = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.pageSize.toString(),
        search,
        orderBy: 'nome',
        orderDirection: 'asc'
      });

      const response = await fetch(`/api/clientes?${params}`);
      const data = await response.json();

      if (response.ok) {
        setClientes(data.data);
        setPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          totalPages: data.totalPages
        }));
      } else {
        toast.showError('Erro ao carregar clientes', data.error);
      }
    } catch (error) {
      toast.showError('Erro ao carregar clientes', 'Verifique sua conexão com a internet');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadClientes();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadClientes(1, searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle create cliente
  const handleCreate = async (data: any) => {
    try {
      setFormLoading(true);
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.showSuccess('Cliente criado com sucesso');
        setShowCreateModal(false);
        loadClientes(pagination.page, searchTerm);
      } else {
        toast.showError('Erro ao criar cliente', result.error);
      }
    } catch (error) {
      toast.showError('Erro ao criar cliente', 'Verifique sua conexão com a internet');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle edit cliente
  const handleEdit = async (data: any) => {
    if (!selectedCliente) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/clientes/${selectedCliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.showSuccess('Cliente atualizado com sucesso');
        setShowEditModal(false);
        setSelectedCliente(null);
        loadClientes(pagination.page, searchTerm);
      } else {
        toast.showError('Erro ao atualizar cliente', result.error);
      }
    } catch (error) {
      toast.showError('Erro ao atualizar cliente', 'Verifique sua conexão com a internet');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete cliente
  const handleDelete = async () => {
    if (!selectedCliente) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/clientes/${selectedCliente.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.showSuccess('Cliente excluído com sucesso');
        setShowDeleteDialog(false);
        setSelectedCliente(null);
        loadClientes(pagination.page, searchTerm);
      } else {
        toast.showError('Erro ao excluir cliente', result.error);
      }
    } catch (error) {
      toast.showError('Erro ao excluir cliente', 'Verifique sua conexão com a internet');
    } finally {
      setFormLoading(false);
    }
  };

  // Table columns
  const columns: Column<Cliente>[] = [
    {
      key: 'nome',
      title: 'Nome',
      sortable: true,
      searchable: true,
      render: (value, item) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">{value}</div>
            {item.email && (
              <div className="text-sm text-gray-500">{item.email}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'telefone',
      title: 'Telefone',
      render: (value) => value || '-'
    },
    {
      key: 'cpf_cnpj',
      title: 'CPF/CNPJ',
      render: (value) => value || '-'
    },
    {
      key: 'contratos_ativos',
      title: 'Contratos Ativos',
      width: '15%',
      render: (value, cliente) => {
        if (!cliente.id) return <span className="text-gray-400 text-xs">N/A</span>;
        return <ClienteContratosCell clienteId={cliente.id} clienteNome={cliente.nome} />;
      }
    },
    {
      key: 'created_at',
      title: 'Cadastrado em',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('pt-BR');
      }
    }
  ];

  return (
    <PageErrorBoundary pageName="Clientes">
      <PermissionGuard permission="clients.view">
        <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600">Gerencie os clientes cadastrados no sistema</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/financeiro"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Sistema Financeiro
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </button>
          </div>
        </div>
      </div>
  
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
  
      {/* Table */}
      <DataTable
        data={clientes}
        columns={columns}
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => loadClientes(page, searchTerm),
          onPageSizeChange: (pageSize) => {
            setPagination(prev => ({ ...prev, pageSize }));
            loadClientes(1, searchTerm);
          }
        }}
        onEdit={(cliente) => {
          setSelectedCliente(cliente);
          setShowEditModal(true);
        }}
        onDelete={(cliente) => {
          setSelectedCliente(cliente);
          setShowDeleteDialog(true);
        }}
        searchable={false}
        emptyMessage="Nenhum cliente encontrado"
      />

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Cliente"
        size="lg"
      >
        <ClienteForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          loading={formLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCliente(null);
        }}
        title="Editar Cliente"
        size="lg"
      >
        <ClienteForm
          cliente={selectedCliente || undefined}
          onSubmit={handleEdit}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedCliente(null);
          }}
          loading={formLoading}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedCliente(null);
        }}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${selectedCliente?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        type="danger"
        loading={formLoading}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
        </div>
      </PermissionGuard>
    </PageErrorBoundary>
  );
}