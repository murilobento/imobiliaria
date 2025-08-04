'use client';

import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  buscarConfiguracoes, 
  atualizarConfiguracoes,
  configuracaoParaForm,
  formParaConfiguracao,
  formatarTaxaPercentual,
  formatarDiasCarencia,
  validarDiasCarencia
} from '@/lib/api/configuracoes-financeiras';
import { ConfiguracaoFinanceira, ConfiguracaoFormData } from '@/types/financeiro';
import { ConfiguracaoNotificacao, CONFIGURACAO_NOTIFICACAO_PADRAO } from '@/types/notificacao';
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner';

interface ConfiguracoesFinanceirasProps {
  className?: string;
}

interface NotificacaoFormData {
  dias_aviso_vencimento: number;
  notificar_vencimento_proximo: boolean;
  notificar_pagamento_atrasado: boolean;
  dias_lembrete_atraso: number;
  max_lembretes_atraso: number;
  dias_aviso_contrato_vencendo: number;
  notificar_contrato_vencendo: boolean;
  ativo: boolean;
}

const ConfiguracoesFinanceiras: React.FC<ConfiguracoesFinanceirasProps> = ({ className = '' }) => {
  const { isAdmin, canAccessSystem } = usePermissions();
  
  // Estados para configurações financeiras
  const [configuracaoFinanceira, setConfiguracaoFinanceira] = useState<ConfiguracaoFinanceira | null>(null);
  const [formFinanceiro, setFormFinanceiro] = useState<ConfiguracaoFormData>({
    taxa_juros_mensal: '',
    taxa_multa: '',
    taxa_comissao: '',
    dias_carencia: 5
  });

  // Estados para configurações de notificações
  const [configuracaoNotificacao, setConfiguracaoNotificacao] = useState<ConfiguracaoNotificacao | null>(null);
  const [formNotificacao, setFormNotificacao] = useState<NotificacaoFormData>({
    dias_aviso_vencimento: CONFIGURACAO_NOTIFICACAO_PADRAO.DIAS_AVISO_VENCIMENTO,
    notificar_vencimento_proximo: CONFIGURACAO_NOTIFICACAO_PADRAO.NOTIFICAR_VENCIMENTO_PROXIMO,
    notificar_pagamento_atrasado: CONFIGURACAO_NOTIFICACAO_PADRAO.NOTIFICAR_PAGAMENTO_ATRASADO,
    dias_lembrete_atraso: CONFIGURACAO_NOTIFICACAO_PADRAO.DIAS_LEMBRETE_ATRASO,
    max_lembretes_atraso: CONFIGURACAO_NOTIFICACAO_PADRAO.MAX_LEMBRETES_ATRASO,
    dias_aviso_contrato_vencendo: CONFIGURACAO_NOTIFICACAO_PADRAO.DIAS_AVISO_CONTRATO_VENCENDO,
    notificar_contrato_vencendo: CONFIGURACAO_NOTIFICACAO_PADRAO.NOTIFICAR_CONTRATO_VENCENDO,
    ativo: CONFIGURACAO_NOTIFICACAO_PADRAO.ATIVO
  });

  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'financeiro' | 'notificacoes'>('financeiro');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar configurações ao montar o componente
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      
      // Carregar configurações financeiras
      const configFinanceira = await buscarConfiguracoes();
      setConfiguracaoFinanceira(configFinanceira);
      setFormFinanceiro(configuracaoParaForm(configFinanceira));

      // Carregar configurações de notificações
      try {
        const response = await fetch('/api/notificacoes/configuracoes');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setConfiguracaoNotificacao(result.data);
            setFormNotificacao({
              dias_aviso_vencimento: result.data.dias_aviso_vencimento,
              notificar_vencimento_proximo: result.data.notificar_vencimento_proximo,
              notificar_pagamento_atrasado: result.data.notificar_pagamento_atrasado,
              dias_lembrete_atraso: result.data.dias_lembrete_atraso,
              max_lembretes_atraso: result.data.max_lembretes_atraso,
              dias_aviso_contrato_vencendo: result.data.dias_aviso_contrato_vencendo,
              notificar_contrato_vencendo: result.data.notificar_contrato_vencendo,
              ativo: result.data.ativo
            });
          }
        }
      } catch (error) {
        console.warn('Erro ao carregar configurações de notificação:', error);
      }

    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setToast({
        message: 'Erro ao carregar configurações',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const validarFormularioFinanceiro = (): boolean => {
    const novosErros: Record<string, string> = {};

    // Validar taxa de juros
    const taxaJuros = parseFloat(formFinanceiro.taxa_juros_mensal);
    if (isNaN(taxaJuros) || taxaJuros < 0 || taxaJuros > 100) {
      novosErros.taxa_juros_mensal = 'Taxa de juros deve ser entre 0% e 100%';
    }

    // Validar taxa de multa
    const taxaMulta = parseFloat(formFinanceiro.taxa_multa);
    if (isNaN(taxaMulta) || taxaMulta < 0 || taxaMulta > 100) {
      novosErros.taxa_multa = 'Taxa de multa deve ser entre 0% e 100%';
    }

    // Validar taxa de comissão
    const taxaComissao = parseFloat(formFinanceiro.taxa_comissao);
    if (isNaN(taxaComissao) || taxaComissao < 0 || taxaComissao > 100) {
      novosErros.taxa_comissao = 'Taxa de comissão deve ser entre 0% e 100%';
    }

    // Validar dias de carência
    if (!validarDiasCarencia(formFinanceiro.dias_carencia)) {
      novosErros.dias_carencia = 'Dias de carência deve ser entre 0 e 30';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const validarFormularioNotificacao = (): boolean => {
    const novosErros: Record<string, string> = {};

    // Validar dias de aviso de vencimento
    if (formNotificacao.dias_aviso_vencimento < 0 || formNotificacao.dias_aviso_vencimento > 30) {
      novosErros.dias_aviso_vencimento = 'Dias de aviso deve ser entre 0 e 30';
    }

    // Validar dias de lembrete de atraso
    if (formNotificacao.dias_lembrete_atraso < 1 || formNotificacao.dias_lembrete_atraso > 30) {
      novosErros.dias_lembrete_atraso = 'Dias de lembrete deve ser entre 1 e 30';
    }

    // Validar máximo de lembretes
    if (formNotificacao.max_lembretes_atraso < 1 || formNotificacao.max_lembretes_atraso > 10) {
      novosErros.max_lembretes_atraso = 'Máximo de lembretes deve ser entre 1 e 10';
    }

    // Validar dias de aviso de contrato vencendo
    if (formNotificacao.dias_aviso_contrato_vencendo < 0 || formNotificacao.dias_aviso_contrato_vencendo > 90) {
      novosErros.dias_aviso_contrato_vencendo = 'Dias de aviso deve ser entre 0 e 90';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvarConfiguracaoFinanceira = async () => {
    if (!validarFormularioFinanceiro()) {
      return;
    }

    try {
      setSaving(true);
      const dadosAtualizacao = formParaConfiguracao(formFinanceiro);
      const configuracaoAtualizada = await atualizarConfiguracoes(dadosAtualizacao);
      
      setConfiguracaoFinanceira(configuracaoAtualizada);
      setToast({
        message: 'Configurações financeiras salvas com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar configurações financeiras:', error);
      setToast({
        message: 'Erro ao salvar configurações financeiras',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const salvarConfiguracaoNotificacao = async () => {
    if (!validarFormularioNotificacao() || !configuracaoNotificacao?.id) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/notificacoes/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: configuracaoNotificacao.id,
          ...formNotificacao
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      const result = await response.json();
      if (result.success) {
        setConfiguracaoNotificacao(result.data);
        setToast({
          message: 'Configurações de notificação salvas com sucesso!',
          type: 'success'
        });
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de notificação:', error);
      setToast({
        message: 'Erro ao salvar configurações de notificação',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetarConfiguracoes = () => {
    if (configuracaoFinanceira) {
      setFormFinanceiro(configuracaoParaForm(configuracaoFinanceira));
    }
    if (configuracaoNotificacao) {
      setFormNotificacao({
        dias_aviso_vencimento: configuracaoNotificacao.dias_aviso_vencimento,
        notificar_vencimento_proximo: configuracaoNotificacao.notificar_vencimento_proximo,
        notificar_pagamento_atrasado: configuracaoNotificacao.notificar_pagamento_atrasado,
        dias_lembrete_atraso: configuracaoNotificacao.dias_lembrete_atraso,
        max_lembretes_atraso: configuracaoNotificacao.max_lembretes_atraso,
        dias_aviso_contrato_vencendo: configuracaoNotificacao.dias_aviso_contrato_vencendo,
        notificar_contrato_vencendo: configuracaoNotificacao.notificar_contrato_vencendo,
        ativo: configuracaoNotificacao.ativo
      });
    }
    setErrors({});
  };

  // Verificar permissões
  if (!isAdmin && !canAccessSystem) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Acesso Negado
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Você não tem permissão para acessar as configurações financeiras.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Configurações do Sistema
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure as taxas financeiras e notificações do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('financeiro')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'financeiro'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configurações Financeiras
          </button>
          <button
            onClick={() => setActiveTab('notificacoes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notificacoes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Notificações e Alertas
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'financeiro' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Taxa de Juros Mensal */}
              <div>
                <label htmlFor="taxa_juros_mensal" className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Juros Mensal (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="taxa_juros_mensal"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formFinanceiro.taxa_juros_mensal}
                    onChange={(e) => setFormFinanceiro(prev => ({
                      ...prev,
                      taxa_juros_mensal: e.target.value
                    }))}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                      errors.taxa_juros_mensal
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="1.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
                {errors.taxa_juros_mensal && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxa_juros_mensal}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Taxa aplicada mensalmente sobre pagamentos em atraso
                </p>
              </div>

              {/* Taxa de Multa */}
              <div>
                <label htmlFor="taxa_multa" className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Multa (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="taxa_multa"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formFinanceiro.taxa_multa}
                    onChange={(e) => setFormFinanceiro(prev => ({
                      ...prev,
                      taxa_multa: e.target.value
                    }))}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                      errors.taxa_multa
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="2.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
                {errors.taxa_multa && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxa_multa}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Multa aplicada uma única vez sobre pagamentos em atraso
                </p>
              </div>

              {/* Taxa de Comissão */}
              <div>
                <label htmlFor="taxa_comissao" className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Comissão (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="taxa_comissao"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formFinanceiro.taxa_comissao}
                    onChange={(e) => setFormFinanceiro(prev => ({
                      ...prev,
                      taxa_comissao: e.target.value
                    }))}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                      errors.taxa_comissao
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="10.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
                {errors.taxa_comissao && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxa_comissao}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Comissão padrão aplicada sobre o valor dos aluguéis
                </p>
              </div>

              {/* Dias de Carência */}
              <div>
                <label htmlFor="dias_carencia" className="block text-sm font-medium text-gray-700 mb-2">
                  Dias de Carência
                </label>
                <input
                  type="number"
                  id="dias_carencia"
                  min="0"
                  max="30"
                  value={formFinanceiro.dias_carencia}
                  onChange={(e) => setFormFinanceiro(prev => ({
                    ...prev,
                    dias_carencia: parseInt(e.target.value) || 0
                  }))}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                    errors.dias_carencia
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="5"
                />
                {errors.dias_carencia && (
                  <p className="mt-1 text-sm text-red-600">{errors.dias_carencia}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Dias de tolerância antes de aplicar juros e multas
                </p>
              </div>
            </div>

            {/* Preview das configurações */}
            {configuracaoFinanceira && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configurações Atuais</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Juros:</span>
                    <span className="ml-2 font-medium">{formatarTaxaPercentual(configuracaoFinanceira.taxa_juros_mensal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Multa:</span>
                    <span className="ml-2 font-medium">{formatarTaxaPercentual(configuracaoFinanceira.taxa_multa)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Comissão:</span>
                    <span className="ml-2 font-medium">{formatarTaxaPercentual(configuracaoFinanceira.taxa_comissao)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Carência:</span>
                    <span className="ml-2 font-medium">{formatarDiasCarencia(configuracaoFinanceira.dias_carencia)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetarConfiguracoes}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarConfiguracaoFinanceira}
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="space-y-6">
            {/* Configurações de Vencimento */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Notificações de Vencimento</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="notificar_vencimento_proximo"
                    type="checkbox"
                    checked={formNotificacao.notificar_vencimento_proximo}
                    onChange={(e) => setFormNotificacao(prev => ({
                      ...prev,
                      notificar_vencimento_proximo: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notificar_vencimento_proximo" className="ml-2 block text-sm text-gray-900">
                    Notificar sobre vencimentos próximos
                  </label>
                </div>

                <div>
                  <label htmlFor="dias_aviso_vencimento" className="block text-sm font-medium text-gray-700 mb-2">
                    Dias de antecedência para aviso
                  </label>
                  <input
                    type="number"
                    id="dias_aviso_vencimento"
                    min="0"
                    max="30"
                    value={formNotificacao.dias_aviso_vencimento}
                    onChange={(e) => setFormNotificacao(prev => ({
                      ...prev,
                      dias_aviso_vencimento: parseInt(e.target.value) || 0
                    }))}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                      errors.dias_aviso_vencimento
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    disabled={!formNotificacao.notificar_vencimento_proximo}
                  />
                  {errors.dias_aviso_vencimento && (
                    <p className="mt-1 text-sm text-red-600">{errors.dias_aviso_vencimento}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configurações de Atraso */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Notificações de Atraso</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="notificar_pagamento_atrasado"
                    type="checkbox"
                    checked={formNotificacao.notificar_pagamento_atrasado}
                    onChange={(e) => setFormNotificacao(prev => ({
                      ...prev,
                      notificar_pagamento_atrasado: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notificar_pagamento_atrasado" className="ml-2 block text-sm text-gray-900">
                    Notificar sobre pagamentos atrasados
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dias_lembrete_atraso" className="block text-sm font-medium text-gray-700 mb-2">
                      Intervalo entre lembretes (dias)
                    </label>
                    <input
                      type="number"
                      id="dias_lembrete_atraso"
                      min="1"
                      max="30"
                      value={formNotificacao.dias_lembrete_atraso}
                      onChange={(e) => setFormNotificacao(prev => ({
                        ...prev,
                        dias_lembrete_atraso: parseInt(e.target.value) || 1
                      }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                        errors.dias_lembrete_atraso
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      disabled={!formNotificacao.notificar_pagamento_atrasado}
                    />
                    {errors.dias_lembrete_atraso && (
                      <p className="mt-1 text-sm text-red-600">{errors.dias_lembrete_atraso}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="max_lembretes_atraso" className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de lembretes
                    </label>
                    <input
                      type="number"
                      id="max_lembretes_atraso"
                      min="1"
                      max="10"
                      value={formNotificacao.max_lembretes_atraso}
                      onChange={(e) => setFormNotificacao(prev => ({
                        ...prev,
                        max_lembretes_atraso: parseInt(e.target.value) || 1
                      }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                        errors.max_lembretes_atraso
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      disabled={!formNotificacao.notificar_pagamento_atrasado}
                    />
                    {errors.max_lembretes_atraso && (
                      <p className="mt-1 text-sm text-red-600">{errors.max_lembretes_atraso}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações de Contrato */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Notificações de Contrato</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="notificar_contrato_vencendo"
                    type="checkbox"
                    checked={formNotificacao.notificar_contrato_vencendo}
                    onChange={(e) => setFormNotificacao(prev => ({
                      ...prev,
                      notificar_contrato_vencendo: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notificar_contrato_vencendo" className="ml-2 block text-sm text-gray-900">
                    Notificar sobre contratos próximos do vencimento
                  </label>
                </div>

                <div>
                  <label htmlFor="dias_aviso_contrato_vencendo" className="block text-sm font-medium text-gray-700 mb-2">
                    Dias de antecedência para aviso
                  </label>
                  <input
                    type="number"
                    id="dias_aviso_contrato_vencendo"
                    min="0"
                    max="90"
                    value={formNotificacao.dias_aviso_contrato_vencendo}
                    onChange={(e) => setFormNotificacao(prev => ({
                      ...prev,
                      dias_aviso_contrato_vencendo: parseInt(e.target.value) || 0
                    }))}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                      errors.dias_aviso_contrato_vencendo
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    disabled={!formNotificacao.notificar_contrato_vencendo}
                  />
                  {errors.dias_aviso_contrato_vencendo && (
                    <p className="mt-1 text-sm text-red-600">{errors.dias_aviso_contrato_vencendo}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configurações Gerais */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Configurações Gerais</h4>
              <div className="flex items-center">
                <input
                  id="ativo"
                  type="checkbox"
                  checked={formNotificacao.ativo}
                  onChange={(e) => setFormNotificacao(prev => ({
                    ...prev,
                    ativo: e.target.checked
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                  Sistema de notificações ativo
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Desative para pausar temporariamente todas as notificações automáticas
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetarConfiguracoes}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarConfiguracaoNotificacao}
                disabled={saving || !configuracaoNotificacao?.id}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast de notificação */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {toast.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    toast.type === 'success' 
                      ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' 
                      : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                  }`}
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesFinanceiras;