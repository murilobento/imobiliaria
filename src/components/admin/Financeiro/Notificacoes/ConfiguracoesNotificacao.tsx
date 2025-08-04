'use client';

import React, { useState, useEffect } from 'react';
import { ConfiguracaoNotificacao } from '@/types/notificacao';

interface ConfiguracoesNotificacaoProps {
  onSave?: (configuracao: ConfiguracaoNotificacao) => void;
}

export default function ConfiguracoesNotificacao({ onSave }: ConfiguracoesNotificacaoProps) {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoNotificacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfiguracao = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notificacoes/configuracoes');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }

      const data = await response.json();
      
      if (data.success) {
        setConfiguracao(data.data);
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfiguracao();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!configuracao) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/notificacoes/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuracao),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configurações');
      }

      const data = await response.json();
      
      if (data.success) {
        setConfiguracao(data.data);
        setSuccess('Configurações salvas com sucesso!');
        
        if (onSave) {
          onSave(data.data);
        }
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ConfiguracaoNotificacao, value: any) => {
    if (!configuracao) return;

    setConfiguracao(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const handleProcessarNotificacoes = async () => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/notificacoes/processar', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao processar notificações');
      }

      const data = await response.json();
      
      if (data.success) {
        const resultado = data.data;
        setSuccess(
          `Processamento concluído! ` +
          `Criadas: ${resultado.notificacoes_criadas}, ` +
          `Enviadas: ${resultado.notificacoes_enviadas}`
        );
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  if (!configuracao) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Erro ao carregar configurações</p>
        <button
          onClick={fetchConfiguracao}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configurações de Notificações
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure quando e como receber notificações sobre vencimentos e atrasos
            </p>
          </div>
          <button
            onClick={handleProcessarNotificacoes}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Processar Agora
          </button>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-400">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configurações Gerais */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configurações Gerais
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={configuracao.ativo}
                onChange={(e) => handleInputChange('ativo', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                Ativar sistema de notificações
              </label>
            </div>
          </div>
        </div>

        {/* Notificações de Vencimento */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Notificações de Vencimento
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notificar_vencimento_proximo"
                checked={configuracao.notificar_vencimento_proximo}
                onChange={(e) => handleInputChange('notificar_vencimento_proximo', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notificar_vencimento_proximo" className="ml-2 block text-sm text-gray-900">
                Notificar sobre vencimentos próximos
              </label>
            </div>

            <div>
              <label htmlFor="dias_aviso_vencimento" className="block text-sm font-medium text-gray-700">
                Dias de antecedência para aviso de vencimento
              </label>
              <input
                type="number"
                id="dias_aviso_vencimento"
                min="0"
                max="30"
                value={configuracao.dias_aviso_vencimento}
                onChange={(e) => handleInputChange('dias_aviso_vencimento', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quantos dias antes do vencimento enviar a notificação (0-30 dias)
              </p>
            </div>
          </div>
        </div>

        {/* Notificações de Atraso */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Notificações de Atraso
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notificar_pagamento_atrasado"
                checked={configuracao.notificar_pagamento_atrasado}
                onChange={(e) => handleInputChange('notificar_pagamento_atrasado', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notificar_pagamento_atrasado" className="ml-2 block text-sm text-gray-900">
                Notificar sobre pagamentos atrasados
              </label>
            </div>

            <div>
              <label htmlFor="dias_lembrete_atraso" className="block text-sm font-medium text-gray-700">
                Intervalo entre lembretes de atraso (dias)
              </label>
              <input
                type="number"
                id="dias_lembrete_atraso"
                min="1"
                max="30"
                value={configuracao.dias_lembrete_atraso}
                onChange={(e) => handleInputChange('dias_lembrete_atraso', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                A cada quantos dias enviar lembretes para pagamentos atrasados (1-30 dias)
              </p>
            </div>

            <div>
              <label htmlFor="max_lembretes_atraso" className="block text-sm font-medium text-gray-700">
                Máximo de lembretes por pagamento
              </label>
              <input
                type="number"
                id="max_lembretes_atraso"
                min="1"
                max="10"
                value={configuracao.max_lembretes_atraso}
                onChange={(e) => handleInputChange('max_lembretes_atraso', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quantos lembretes enviar no máximo para cada pagamento atrasado (1-10)
              </p>
            </div>
          </div>
        </div>

        {/* Notificações de Contrato */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Notificações de Contrato
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notificar_contrato_vencendo"
                checked={configuracao.notificar_contrato_vencendo}
                onChange={(e) => handleInputChange('notificar_contrato_vencendo', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notificar_contrato_vencendo" className="ml-2 block text-sm text-gray-900">
                Notificar sobre contratos próximos do vencimento
              </label>
            </div>

            <div>
              <label htmlFor="dias_aviso_contrato_vencendo" className="block text-sm font-medium text-gray-700">
                Dias de antecedência para aviso de contrato vencendo
              </label>
              <input
                type="number"
                id="dias_aviso_contrato_vencendo"
                min="0"
                max="90"
                value={configuracao.dias_aviso_contrato_vencendo}
                onChange={(e) => handleInputChange('dias_aviso_contrato_vencendo', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quantos dias antes do fim do contrato enviar a notificação (0-90 dias)
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={fetchConfiguracao}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}