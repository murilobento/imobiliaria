'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPagamentosList, PagamentosListParams } from '@/lib/api/pagamentos'
import { PagamentoAluguel, PAGAMENTO_STATUS, PAGAMENTO_STATUS_LABELS, PagamentoFilters } from '@/types/financeiro'
import { DataTable } from '@/components/admin/Common/DataTable'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'
import Modal from '@/components/admin/Common/Modal'
import { ToastContainer, useToast } from '@/components/admin/Common/Toast'
import PagamentoForm from './PagamentoForm'

interface PagamentosListProps {
  contratoId?: string
  showFilters?: boolean
  onPagamentoSelect?: (pagamento: PagamentoAluguel) => void
}

export default function PagamentosList({ 
  contratoId, 
  showFilters = true, 
  onPagamentoSelect 
}: PagamentosListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [orderBy, setOrderBy] = useState<'valor_devido' | 'data_vencimento' | 'data_pagamento' | 'created_at'>('data_vencimento')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<PagamentoFilters>({})
  const [showForm, setShowForm] = useState(false)
  const [editingPagamento, setEditingPagamento] = useState<PagamentoAluguel | null>(null)
  const { toasts, removeToast, showSuccess, showError } = useToast()

  // Aplicar filtro de contrato se fornecido
  const appliedFilters = useMemo(() => {
    const baseFilters = { ...filters }
    if (contratoId) {
      baseFilters.contrato_id = contratoId
    }
    return baseFilters
  }, [filters, contratoId])

  const queryParams: PagamentosListParams = {
    page: currentPage,
    limit: 10,
    search: searchTerm,
    orderBy,
    orderDirection,
    filters: appliedFilters
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pagamentos-list', queryParams],
    queryFn: () => getPagamentosList(queryParams),
    staleTime: 1000 * 60 * 5 // 5 minutos
  })

  const handleEdit = (pagamento: PagamentoAluguel) => {
    setEditingPagamento(pagamento)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingPagamento(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingPagamento(null)
  }

  const handleFormSuccess = (message: string) => {
    showSuccess('Sucesso', message)
    setShowForm(false)
    setEditingPagamento(null)
    refetch()
  }

  const handleFormError = (message: string) => {
    showError('Erro', message)
  }

  const handleRowClick = (pagamento: PagamentoAluguel) => {
    if (onPagamentoSelect) {
      onPagamentoSelect(pagamento)
    } else {
      handleEdit(pagamento)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      pago: 'bg-green-100 text-green-800',
      atrasado: 'bg-red-100 text-red-800',
      cancelado: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {PAGAMENTO_STATUS_LABELS[status as keyof typeof PAGAMENTO_STATUS_LABELS]}
      </span>
    )
  }

  const columns = [
    {
      key: 'mes_referencia',
      label: 'Mês Referência',
      render: (pagamento: PagamentoAluguel) => {
        const date = new Date(pagamento.mes_referencia)
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      }
    },
    {
      key: 'contrato',
      label: 'Imóvel/Inquilino',
      render: (pagamento: PagamentoAluguel) => (
        <div className="text-sm">
          <div className="font-medium">
            {pagamento.contrato?.imovel?.endereco || 'Imóvel não encontrado'}
          </div>
          <div className="text-gray-500">
            {pagamento.contrato?.inquilino?.nome || 'Inquilino não encontrado'}
          </div>
        </div>
      )
    },
    {
      key: 'valor_devido',
      label: 'Valor Devido',
      render: (pagamento: PagamentoAluguel) => formatCurrency(pagamento.valor_devido)
    },
    {
      key: 'valor_pago',
      label: 'Valor Pago',
      render: (pagamento: PagamentoAluguel) => 
        pagamento.valor_pago ? formatCurrency(pagamento.valor_pago) : '-'
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (pagamento: PagamentoAluguel) => formatDate(pagamento.data_vencimento)
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      render: (pagamento: PagamentoAluguel) => 
        pagamento.data_pagamento ? formatDate(pagamento.data_pagamento) : '-'
    },
    {
      key: 'juros_multa',
      label: 'Juros/Multa',
      render: (pagamento: PagamentoAluguel) => {
        const total = pagamento.valor_juros + pagamento.valor_multa
        return total > 0 ? formatCurrency(total) : '-'
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (pagamento: PagamentoAluguel) => getStatusBadge(pagamento.status)
    }
  ]

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Erro ao carregar pagamentos: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {Object.entries(PAGAMENTO_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimento (De)
              </label>
              <input
                type="date"
                value={filters.data_vencimento_inicio || ''}
                onChange={(e) => setFilters({ ...filters, data_vencimento_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimento (Até)
              </label>
              <input
                type="date"
                value={filters.data_vencimento_fim || ''}
                onChange={(e) => setFilters({ ...filters, data_vencimento_fim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês Referência
              </label>
              <input
                type="month"
                value={filters.mes_referencia || ''}
                onChange={(e) => setFilters({ ...filters, mes_referencia: e.target.value + '-01' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {contratoId ? 'Pagamentos do Contrato' : 'Pagamentos'}
          </h2>
          <p className="text-gray-600">
            {data?.total || 0} pagamento(s) encontrado(s)
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Novo Pagamento
        </button>
      </div>

      {/* Busca */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por observações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={`${orderBy}-${orderDirection}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split('-')
            setOrderBy(field as any)
            setOrderDirection(direction as 'asc' | 'desc')
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="data_vencimento-desc">Vencimento (Mais recente)</option>
          <option value="data_vencimento-asc">Vencimento (Mais antigo)</option>
          <option value="valor_devido-desc">Valor (Maior)</option>
          <option value="valor_devido-asc">Valor (Menor)</option>
          <option value="created_at-desc">Criação (Mais recente)</option>
          <option value="created_at-asc">Criação (Mais antigo)</option>
        </select>
      </div>

      {/* Tabela */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        onRowClick={handleRowClick}
        currentPage={currentPage}
        totalPages={data?.totalPages || 1}
        onPageChange={setCurrentPage}
        emptyMessage="Nenhum pagamento encontrado"
      />

      {/* Modal do formulário */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={handleFormClose}
          title={editingPagamento ? 'Editar Pagamento' : 'Novo Pagamento'}
          size="lg"
        >
          <PagamentoForm
            pagamento={editingPagamento}
            contratoId={contratoId}
            onSuccess={handleFormSuccess}
            onError={handleFormError}
            onCancel={handleFormClose}
          />
        </Modal>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}