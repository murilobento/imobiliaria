'use client';

import React from 'react';
import { ConfiguracoesFinanceiras } from '@/components/admin/Financeiro/Configuracoes';
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs';

export default function ConfiguracoesPage() {
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Financeiro', href: '/admin/financeiro' },
    { label: 'Configurações', href: '/admin/financeiro/configuracoes' }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurações do Sistema Financeiro
          </h1>
          <p className="text-gray-600 mt-1">
            Configure as taxas, regras financeiras e notificações do sistema
          </p>
        </div>
      </div>

      <ConfiguracoesFinanceiras />
    </div>
  );
}