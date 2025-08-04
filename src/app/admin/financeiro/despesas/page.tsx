'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Receipt, Plus, Search, Filter, BarChart3 } from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'
import DespesasList from '@/components/admin/Financeiro/Despesas/DespesasList'
import DespesasCategoria from '@/components/admin/Financeiro/Despesas/DespesasCategoria'

export default function DespesasPage() {
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [viewMode, setViewMode] = useState<'lista' | 'categoria'>('lista')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Simular carregamento inicial
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Financeiro', href: '/admin/financeiro' },
    { label: 'Despesas', current: true }
  ]

  if (!isMounted) {
    return null
  }

  return (
    <PageErrorBoundary pageName="Gestão de Despesas">
      <div className="p-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestão de Despesas
                </h1>
                <p className="text-gray-600 mt-1">
                  Controle despesas dos imóveis por categoria
                </p>
              </div>
            </div>
            <Link
              href="/admin/financeiro/despesas/nova"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'lista'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('categoria')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'categoria'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Por Categoria
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
                  placeholder="Buscar por descrição, imóvel ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={categoriaFilter}
                  onChange={(e) => setCategoriaFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="todas">Todas as Categorias</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="impostos">Impostos</option>
                  <option value="seguros">Seguros</option>
                  <option value="administracao">Administração</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="pago">Pagas</option>
                  <option value="cancelado">Canceladas</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner
              size="lg"
              text="Carregando despesas..."
              showNetworkStatus
            />
          </div>
        ) : (
          <div>
            {viewMode === 'lista' ? (
              <DespesasList />
            ) : (
              <DespesasCategoria />
            )}
          </div>
        )}
      </div>
    </PageErrorBoundary>
  )
}