'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CreditCard, Calendar, Search, Filter, Plus } from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'
import PagamentosList from '@/components/admin/Financeiro/Pagamentos/PagamentosList'
import ProcessarVencimentos from '@/components/admin/Financeiro/Pagamentos/ProcessarVencimentos'

export default function PagamentosPage() {
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [mesFilter, setMesFilter] = useState('')
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Simular carregamento inicial
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Financeiro', href: '/admin/financeiro' },
    { label: 'Pagamentos', current: true }
  ]

  if (!isMounted) {
    return null
  }

  return (
    <PageErrorBoundary pageName="Controle de Pagamentos">
      <div className="p-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Controle de Pagamentos
                </h1>
                <p className="text-gray-600 mt-1">
                  Gerencie pagamentos de aluguel e inadimplência
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProcessarVencimentos />
              <Link
                href="/admin/financeiro/pagamentos/calendario"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendário
              </Link>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'lista'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'calendario'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Calendário
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por inquilino, contrato ou imóvel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="pago">Pagos</option>
                  <option value="atrasado">Atrasados</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
            </div>

            {/* Month Filter */}
            <div className="sm:w-48">
              <input
                type="month"
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner
              size="lg"
              text="Carregando pagamentos..."
              showNetworkStatus
            />
          </div>
        ) : (
          <div>
            {viewMode === 'lista' ? (
              <PagamentosList />
            ) : (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Calendário de Pagamentos
                  </h3>
                  <p className="text-gray-500">
                    Visualização em calendário será implementada em breve
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageErrorBoundary>
  )
}