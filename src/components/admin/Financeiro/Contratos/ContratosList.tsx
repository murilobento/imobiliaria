'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Filter, X } from 'lucide-react';
import DataTable, { Column } from '../../Common/DataTable';
import ContratoStatus from './ContratoStatus';
import { ContratoAluguel, ContratoFilters, CONTRATO_STATUS } from '../../../../types/financeiro';
import { getContratosList, ContratosListParams } from '../../../../lib/api/contratos';

interface ContratosListProps {
  onEdit?: (contrato: ContratoAluguel) => void;
  onDelete?: (contrato: ContratoAluguel) => void;
  onNew?: () => void;
  className?: string;
}

export default function ContratosList({
  onEdit,
  onDelete,
  onNew,
  className = ''
}: ContratosListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ContratoFilters>({});

  // Query parameters
  const queryParams: ContratosListParams = useMemo(() => ({
    page,
    limit: pageSize,
    search: searchTerm,
    orderBy: 'created_at',
    orderDirection: 'desc',
    filters
  }), [page, pageSize, searchTerm, filters]);

  // Fetch data
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['contratos-list', queryParams],
    queryFn: () => getContratosList(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Format currency
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }, []);

  // Table columns
  const columns: Column<ContratoAluguel>[] = useMemo(() => [
    {
      key: 'imovel',
      title: 'Imóvel',
      sortable: false,
      searchable: true,
      render: (_, contrato) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {contrato.imovel?.endereco || 'N/A'}
          </div>
          <div className="text-gray-500">
            {contrato.imovel?.cidade?.nome || 'N/A'}
          </div>
        </div>
      ),
      width: '25%'
    },
    {
      key: 'inquilino',
      title: 'Inquilino',
      sortable: false,
      searchable: true,
      render: (_, contrato) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {contrato.inquilino?.nome || 'N/A'}
          </div>
          <div className="text-gray-500">
            {contrato.inquilino?.email || contrato.inquilino?.telefone || 'N/A'}
          </div>
        </div>
      ),
      width: '20%'
    },
    {
      key: 'valor_aluguel',
      title: 'Valor',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(value)}
        </span>
      ),
      width: '12%'
    },
    {
      key: 'data_inicio',
      title: 'Início',
      sortable: true,
      render: (value) => formatDate(value),
      width: '10%'
    },
    {
      key: 'data_fim',
      title: 'Fim',
      sortable: true,
      render: (value) => formatDate(value),
      width: '10%'
    },
    {
      key: 'dia_vencimento',
      title: 'Vencimento',
      sortable: true,
      render: (value) => `Dia ${value}`,
      width: '10%'
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => <ContratoStatus status={value} />,
      width: '10%'
    }
  ], [formatCurrency, formatDate]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof ContratoFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(1); // Reset to first page when filtering
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  // Check if filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          Erro ao carregar contratos: {error.message}
        </div>
        <button
          onClick={() => refetch()}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Contratos de Aluguel</h2>
          <p className="text-sm text-gray-600">
            {response?.total || 0} contratos encontrados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.values(filters).filter(v => v !== undefined && v !== '').length}
              </span>
            )}
          </button>
          {onNew && (
            <button
              onClick={onNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value={CONTRATO_STATUS.ATIVO}>Ativo</option>
                <option value={CONTRATO_STATUS.ENCERRADO}>Encerrado</option>
                <option value={CONTRATO_STATUS.SUSPENSO}>Suspenso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início (a partir de)
              </label>
              <input
                type="date"
                value={filters.data_inicio || ''}
                onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim (até)
              </label>
              <input
                type="date"
                value={filters.data_fim || ''}
                onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Mínimo
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.valor_min || ''}
                onChange={(e) => handleFilterChange('valor_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <DataTable
        data={response?.data || []}
        columns={columns}
        loading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        searchable={true}
        searchPlaceholder="Buscar por observações..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        emptyMessage="Nenhum contrato encontrado"
        pagination={{
          page,
          pageSize,
          total: response?.total || 0,
          onPageChange: setPage,
          onPageSizeChange: setPageSize
        }}
      />
    </div>
  );
}