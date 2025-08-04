'use client'

import { Receipt } from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import DespesaForm from '@/components/admin/Financeiro/Despesas/DespesaForm'

export default function NovaDespesaPage() {
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Financeiro', href: '/admin/financeiro' },
    { label: 'Despesas', href: '/admin/financeiro/despesas' },
    { label: 'Nova Despesa', current: true }
  ]

  return (
    <PageErrorBoundary pageName="Nova Despesa">
      <div className="p-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <Receipt className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Nova Despesa
              </h1>
              <p className="text-gray-600 mt-1">
                Registre uma nova despesa relacionada a um imóvel
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <DespesaForm 
            onSubmit={() => {
              // TODO: Implement success handling
              window.history.back()
            }}
            onCancel={() => {
              window.history.back()
            }}
          />
        </div>
      </div>
    </PageErrorBoundary>
  )
}