'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  DollarSign, 
  FileText, 
  CreditCard, 
  Receipt, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Building
} from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'

interface FinancialStats {
  contratosAtivos: number
  pagamentosVencidos: number
  receitaMensal: number
  despesasMes: number
  rentabilidade: number
}

export default function FinanceiroDashboard() {
  const [stats, setStats] = useState<FinancialStats>({
    contratosAtivos: 0,
    pagamentosVencidos: 0,
    receitaMensal: 0,
    despesasMes: 0,
    rentabilidade: 0
  })
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadFinancialStats()
    }
  }, [isMounted])

  const loadFinancialStats = async () => {
    try {
      setLoading(true)
      
      // TODO: Implementar chamadas para as APIs financeiras
      // Por enquanto, usando dados mockados
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStats({
        contratosAtivos: 15,
        pagamentosVencidos: 3,
        receitaMensal: 25000,
        despesasMes: 5000,
        rentabilidade: 80
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas financeiras:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const statsCards = [
    {
      name: 'Contratos Ativos',
      value: loading ? '...' : stats.contratosAtivos.toString(),
      icon: FileText,
      color: 'bg-blue-500',
      href: '/admin/financeiro/contratos',
      description: 'Contratos de aluguel ativos'
    },
    {
      name: 'Pagamentos Vencidos',
      value: loading ? '...' : stats.pagamentosVencidos.toString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      href: '/admin/financeiro/pagamentos',
      description: 'Pagamentos em atraso'
    },
    {
      name: 'Receita Mensal',
      value: loading ? '...' : formatCurrency(stats.receitaMensal),
      icon: TrendingUp,
      color: 'bg-green-500',
      href: '/admin/financeiro/relatorios',
      description: 'Receita do mês atual'
    },
    {
      name: 'Despesas do Mês',
      value: loading ? '...' : formatCurrency(stats.despesasMes),
      icon: Receipt,
      color: 'bg-orange-500',
      href: '/admin/financeiro/despesas',
      description: 'Despesas do mês atual'
    }
  ]

  const quickActions = [
    {
      name: 'Novo Contrato',
      description: 'Criar um novo contrato de aluguel',
      href: '/admin/financeiro/contratos/novo',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
    },
    {
      name: 'Registrar Pagamento',
      description: 'Registrar pagamento de aluguel',
      href: '/admin/financeiro/pagamentos',
      icon: CreditCard,
      color: 'bg-green-50 text-green-600 hover:bg-green-100'
    },
    {
      name: 'Nova Despesa',
      description: 'Registrar despesa de imóvel',
      href: '/admin/financeiro/despesas/nova',
      icon: Receipt,
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100'
    },
    {
      name: 'Relatórios',
      description: 'Visualizar relatórios financeiros',
      href: '/admin/financeiro/relatorios',
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
    }
  ]

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Financeiro', current: true }
  ]

  if (!isMounted) {
    return null
  }

  return (
    <PageErrorBoundary pageName="Dashboard Financeiro">
      <div className="p-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="mb-8">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema Financeiro
              </h1>
              <p className="text-gray-600 mt-1">
                Controle de aluguéis, pagamentos e relatórios financeiros
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <LoadingSpinner
              size="lg"
              text="Carregando dados financeiros..."
              showNetworkStatus
            />
          </div>
        )}

        {!loading && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div>
              <div className="flex items-center mb-4">
                <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Resumo Financeiro</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                          <p className="text-xl font-bold text-gray-900 mb-1">
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
                <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Integration Links */}
            <div>
              <div className="flex items-center mb-4">
                <Building className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Módulos Relacionados</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                  href="/admin/imoveis"
                  className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 p-6 group border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        Gerenciar Imóveis
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Visualizar imóveis disponíveis e status de aluguel
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/clientes"
                  className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 p-6 group border border-gray-200 hover:border-green-300"
                >
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                        Gerenciar Clientes
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Visualizar clientes e contratos ativos
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageErrorBoundary>
  )
}