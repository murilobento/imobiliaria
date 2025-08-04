'use client'

import { FileText } from 'lucide-react'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary'
import ContratoForm from '@/components/admin/Financeiro/Contratos/ContratoForm'

export default function NovoContratoPage() {
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Financeiro', href: '/admin/financeiro' },
    { label: 'Contratos', href: '/admin/financeiro/contratos' },
    { label: 'Novo Contrato', current: true }
  ]

  return (
    <PageErrorBoundary pageName="Novo Contrato">
      <div className="p-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Novo Contrato de Aluguel
              </h1>
              <p className="text-gray-600 mt-1">
                Preencha os dados para criar um novo contrato
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <ContratoForm 
            onSave={async (data) => {
              // TODO: Implement contract creation
              console.log('Creating contract:', data)
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