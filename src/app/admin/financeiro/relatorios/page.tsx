'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, FileText, TrendingDown, TrendingUp, Download } from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'
import RelatorioFinanceiro from '@/components/admin/Financeiro/Relatorios/RelatorioFinanceiro'
import RelatorioInadimplencia from '@/components/admin/Financeiro/Relatorios/RelatorioInadimplencia'
import RelatorioRentabilidade from '@/components/admin/Financeiro/Relatorios/RelatorioRentabilidade'
import ExportarRelatorio from '@/components/admin/Financeiro/Relatorios/ExportarRelatorio'

export default function RelatoriosPage() {
    const [loading, setLoading] = useState(true)
    const [activeReport, setActiveReport] = useState<'financeiro' | 'inadimplencia' | 'rentabilidade'>('financeiro')
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        // Simular carregamento inicial
        setTimeout(() => setLoading(false), 1000)
    }, [])

    const breadcrumbItems = [
        { label: 'Dashboard', href: '/admin' },
        { label: 'Financeiro', href: '/admin/financeiro' },
        { label: 'Relatórios', current: true }
    ]

    const reportTypes = [
        {
            id: 'financeiro' as const,
            name: 'Relatório Financeiro',
            description: 'Receitas, despesas e fluxo de caixa',
            icon: BarChart3,
            color: 'bg-blue-500'
        },
        {
            id: 'inadimplencia' as const,
            name: 'Relatório de Inadimplência',
            description: 'Pagamentos em atraso e pendências',
            icon: TrendingDown,
            color: 'bg-red-500'
        },
        {
            id: 'rentabilidade' as const,
            name: 'Relatório de Rentabilidade',
            description: 'Análise de rentabilidade por imóvel',
            icon: TrendingUp,
            color: 'bg-green-500'
        }
    ]

    if (!isMounted) {
        return null
    }

    return (
        <PageErrorBoundary pageName="Relatórios Financeiros">
            <div className="p-6">
                <Breadcrumbs items={breadcrumbItems} />

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Relatórios Financeiros
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Análise detalhada da performance financeira
                                </p>
                            </div>
                        </div>
                        <ExportarRelatorio tipoRelatorio={activeReport} />
                    </div>
                </div>

                {/* Report Type Selector */}
                <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {reportTypes.map((report) => {
                            const Icon = report.icon
                            const isActive = activeReport === report.id

                            return (
                                <button
                                    key={report.id}
                                    onClick={() => setActiveReport(report.id)}
                                    className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${isActive
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center mb-3">
                                        <div className={`${report.color} p-2 rounded-lg mr-3`}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'
                                            }`}>
                                            {report.name}
                                        </h3>
                                    </div>
                                    <p className={`text-sm ${isActive ? 'text-blue-700' : 'text-gray-600'
                                        }`}>
                                        {report.description}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Report Content */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <LoadingSpinner
                            size="lg"
                            text="Carregando relatório..."
                            showNetworkStatus
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow border border-gray-200">
                        {activeReport === 'financeiro' && <RelatorioFinanceiro />}
                        {activeReport === 'inadimplencia' && <RelatorioInadimplencia />}
                        {activeReport === 'rentabilidade' && <RelatorioRentabilidade />}
                    </div>
                )}
            </div>
        </PageErrorBoundary>
    )
}