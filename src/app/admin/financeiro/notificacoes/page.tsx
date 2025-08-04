'use client';

import React, { useState } from 'react';
import NotificacoesList from '@/components/admin/Financeiro/Notificacoes/NotificacoesList';
import ConfiguracoesNotificacao from '@/components/admin/Financeiro/Notificacoes/ConfiguracoesNotificacao';

export default function NotificacoesPage() {
  const [activeTab, setActiveTab] = useState<'lista' | 'configuracoes'>('lista');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Sistema de Notificações
        </h1>
        <p className="text-gray-600 mt-2">
          Gerencie notificações de vencimentos, atrasos e contratos
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('lista')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lista'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Notificações
          </button>
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'configuracoes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configurações
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'lista' && (
          <NotificacoesList 
            showFilters={true}
            onNotificacaoClick={(notificacao) => {
              console.log('Notificação clicada:', notificacao);
            }}
          />
        )}

        {activeTab === 'configuracoes' && (
          <ConfiguracoesNotificacao 
            onSave={(configuracao) => {
              console.log('Configuração salva:', configuracao);
            }}
          />
        )}
      </div>
    </div>
  );
}