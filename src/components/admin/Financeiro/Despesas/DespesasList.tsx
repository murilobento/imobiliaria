'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Calendar, DollarSign } from 'lucide-react';
import DataTable, { Column } from '../../Common/DataTable';
import Modal from '../../Common/Modal';
import LoadingSpinner from '../../Common/LoadingSpinner';
import { DespesaImovel, DespesaFilters, DESPESA_CATEGORIA_LABELS, DESPESA_STATUS_LABELS } from '../../../../types/financeiro';
import { getDespesasList, deleteDespesa } from '../../../../lib/api/despesas';
import { getImoveis } from '../../../../lib/api/imoveis';
import { Imovel } from '../../../../types/imovel';
import DespesaForm from './DespesaForm';

interface DespesasListProps {
  onEdit?: (despesa: DespesaImovel) => void;
  onDelete?: (despesa: DespesaImovel) => void;
  showActions?: boolean;
}

export default function DespesasList({ 
  onEdit, 
  onDelete, 
  showActions = true 
}: DespesasListProps) {
  const [despesas, setDespesas] = useState<DespesaImovel[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<DespesaImovel | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<DespesaFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Load data
  useEffect(() => {
    loadDespesas();
    loadImoveis();
  }, [currentPage, pageSize, filters, searchTerm]);

  const loadDespesas = async () => {
    try {
      setLoading(true);
      const response = await getDespesasList({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        filters
      });
      
      setDespesas(response.data);
      setTotalItems(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const loadImoveis = async () => {
    try {
      const response = await getImoveis({}, { page: 1, limit: 1000 });
      setImoveis(response.data);
    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
    }
  };

  const handleEdit = (despesa: DespesaImovel) => {
    setEditingDespesa(despesa);
    setShowForm(true);
    if (onEdit) onEdit(despesa);
  };

  const handleDelete = async (despesa: DespesaImovel) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    try {
      await deleteDespesa(despesa.id!);
      await loadDespesas();
      if (onDelete) onDelete(despesa);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir despesa');
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingDespesa(null);
    await loadDespesas();
  };

  const handleFilterChange = (newFilters: Partial<DespesaFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      pago: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {DESPESA_STATUS_LABELS[status as keyof typeof DESPESA_STATUS_LABELS]}
      </span>
    );
  };

  const getCategoryBadge = (categoria: string) => {
    const colors = {
      manutencao: 'bg-blue-100 text-blue-800',
      impostos: 'bg-purple-100 text-purple-800',
      seguros: 'bg-indigo-100 text-indigo-800',
      administracao: 'bg-gray-100 text-gray-800',
      outros: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[categoria as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {DESPESA_CATEGORIA_LABELS[categoria as keyof typeof DESPESA_CATEGORIA_LABELS]}
      </span>
    );
  };

  const columns: Column<DespesaImovel>[] = [
    {
      key: 'descricao',
      title: 'Descrição',
      sortable: true,
      searchable: true,
      render: (value, item) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {item.imovel && (
            <div className="text-sm text-gray-500">
              {item.imovel.nome || `${item.imovel.tipo} - ${item.imovel.endereco_completo}`}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'categoria',
      title: 'Categoria',
      sortable: true,
      render: (value) => getCategoryBadge(value)
    },
    {
      key: 'valor',
      title: 'Valor',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'data_despesa',
      title: 'Data da Despesa',
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'data_pagamento',
      title: 'Data do Pagamento',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={() => {
            setError(null);
            loadDespesas();
          }}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Despesas</h2>
          <p className="text-gray-600">Gerencie as despesas dos imóveis</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={filters.categoria || ''}
                onChange={(e) => handleFilterChange({ categoria: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as categorias</option>
                {Object.entries(DESPESA_CATEGORIA_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Property Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imóvel
              </label>
              <select
                value={filters.imovel_id || ''}
                onChange={(e) => handleFilterChange({ imovel_id: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os imóveis</option>
                {imoveis.map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {imovel.nome || `${imovel.tipo} - ${imovel.endereco_completo}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os status</option>
                {Object.entries(DESPESA_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.data_inicio || ''}
                  onChange={(e) => handleFilterChange({ data_inicio: e.target.value || undefined })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.data_fim || ''}
                  onChange={(e) => handleFilterChange({ data_fim: e.target.value || undefined })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Despesas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(despesas.reduce((sum, d) => sum + d.valor, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Despesas Pagas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(despesas.filter(d => d.status === 'pago').reduce((sum, d) => sum + d.valor, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Despesas Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(despesas.filter(d => d.status === 'pendente').reduce((sum, d) => sum + d.valor, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={despesas}
        columns={columns}
        loading={loading}
        searchable={true}
        searchPlaceholder="Buscar por descrição..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onEdit={showActions ? handleEdit : undefined}
        onDelete={showActions ? handleDelete : undefined}
        emptyMessage="Nenhuma despesa encontrada"
        pagination={{
          page: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize
        }}
      />

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingDespesa(null);
        }}
        title={editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
        size="lg"
      >
        <DespesaForm
          despesa={editingDespesa}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingDespesa(null);
          }}
        />
      </Modal>
    </div>
  );
}