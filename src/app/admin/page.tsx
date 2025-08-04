'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Building, MapPin, Home, TrendingUp, Activity } from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'

interface Stats {
  clientes: number
  imoveis: number
  cidades: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    clientes: 0,
    imoveis: 0,
    cidades: 0
  })
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadStats()
    }
  }, [isMounted])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Buscar totais das APIs
      const [clientesRes, imoveisRes, cidadesRes] = await Promise.all([
        fetch('/api/clientes?limit=1'),
        fetch('/api/imoveis?limit=1'),
        fetch('/api/cidades')
      ])

      const clientesData = await clientesRes.json()
      const imoveisData = await imoveisRes.json()
      const cidadesData = await cidadesRes.json()

      setStats({
        clientes: clientesData.total || 0,
        imoveis: imoveisData.pagination?.total || 0,
        cidades: Array.isArray(cidadesData.cidades) ? cidadesData.cidades.length : 0
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      name: 'Total de Clientes',
      value: loading ? '...' : stats.clientes.toString(),
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/clientes',
      description: 'Clientes cadastrados no sistema'
    },
    {
      name: 'Total de Imóveis',
      value: loading ? '...' : stats.imoveis.toString(),
      icon: Building,
      color: 'bg-green-500',
      href: '/admin/imoveis',
      description: 'Imóveis disponíveis no portfólio'
    },
    {
      name: 'Cidades Ativas',
      value: loading ? '...' : stats.cidades.toString(),
      icon: MapPin,
      color: 'bg-purple-500',
      href: '/admin/cidades',
      description: 'Cidades com imóveis cadastrados'
    }
  ]

  const quickActions = [
    {
      name: 'Novo Cliente',
      description: 'Cadastrar um novo cliente',
      href: '/admin/clientes',
      icon: Users,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
    },
    {
      name: 'Novo Imóvel',
      description: 'Adicionar um novo imóvel',
      href: '/admin/imoveis',
      icon: Building,
      color: 'bg-green-50 text-green-600 hover:bg-green-100'
    },
    {
      name: 'Gerenciar Cidades',
      description: 'Administrar cidades disponíveis',
      href: '/admin/cidades',
      icon: MapPin,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
    }
  ]

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Dashboard', current: true }
  ]

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return null
  }

  return (
    <PageErrorBoundary pageName="Dashboard">
      <div className="p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Painel Administrativo
              </h1>
              <p className="text-gray-600 mt-1">
                Bem-vindo ao sistema de gerenciamento imobiliário
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <LoadingSpinner
              size="lg"
              text="Carregando estatísticas..."
              showNetworkStatus
            />
          </div>
        )}

        {/* Stats Cards */}
        {!loading && (
          <div className="space-y-8">
            <div>
              <div className="flex items-center mb-4">
                <TrendingUp className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Estatísticas Gerais</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsCards.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <Link
                      key={stat.name}
                      href={stat.href}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 p-6 group border border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-center">
                        <div className={`${stat.color} p-3 rounded-lg group-hover:scale-105 transition-transform`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                            {stat.name}
                          </p>
                          <p className="text-2xl font-bold text-gray-900 mb-1">
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-500">
                            {stat.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="flex items-center mb-4">
                <Activity className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.name}
                      href={action.href}
                      className={`${action.color} rounded-lg p-4 transition-all duration-200 border border-gray-200 hover:border-gray-300`}
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        <div>
                          <p className="font-medium text-sm">
                            {action.name}
                          </p>
                          <p className="text-xs opacity-75">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div>
              <div className="flex items-center mb-4">
                <Activity className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Atividade Recente</h2>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">
                    Funcionalidade de atividade recente será implementada em breve
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageErrorBoundary>
  )
}