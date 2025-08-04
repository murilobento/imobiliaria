'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Home, 
  FileText, 
  Clock,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import LoadingSpinner from '../../Common/LoadingSpinner';
import ContratoStatus from './ContratoStatus';
import { ContratoAluguel, PagamentoAluguel, PAGAMENTO_STATUS_LABELS } from '../../../../types/financeiro';
import { getContratoById } from '../../../../lib/api/contratos';
import { supabase } from '../../../../lib/supabase';

interface ContratoDetailsProps {
  contratoId: string;
  onEdit?: (contrato: ContratoAluguel) => void;
  onDelete?: (contrato: ContratoAluguel) => void;
  className?: string;
}

export default function ContratoDetails({
  contratoId,
  onEdit,
  onDelete,
  className = ''
}: ContratoDetailsProps) {
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Fetch contract details
  const {
    data: contrato,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['contrato-details', contratoId],
    queryFn: () => getContratoById(contratoId),
    enabled: !!contratoId
  });

  // Fetch payment history
  const {
    data: pagamentos,
    isLoading: pagamentosLoading
  } = useQuery({
    queryKey: ['pagamentos-contrato', contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos_aluguel')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('mes_referencia', { ascending: false });
      
      if (error) throw error;
      return data as PagamentoAluguel[];
    },
    enabled: !!contratoId && showPaymentHistory
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Calculate contract summary
  const contractSummary = useMemo(() => {
    if (!contrato || !pagamentos) return null;

    const totalPago = pagamentos
      .filter(p => p.status === 'pago')
      .reduce((sum, p) => sum + (p.valor_pago || 0), 0);

    const totalPendente = pagamentos
      .filter(p => p.status === 'pendente' || p.status === 'atrasado')
      .reduce((sum, p) => sum + p.valor_devido, 0);

    const totalJurosMultas = pagamentos
      .reduce((sum, p) => sum + p.valor_juros + p.valor_multa, 0);

    return {
      totalPago,
      totalPendente,
      totalJurosMultas,
      pagamentosAtrasados: pagamentos.filter(p => p.status === 'atrasado').length
    };
  }, [contrato, pagamentos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner text="Carregando detalhes do contrato..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          Erro ao carregar contrato: {error.message}
        </div>
        <button
          onClick={() => refetch()}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="text-yellow-800">
          Contrato não encontrado
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Detalhes do Contrato
            </h2>
            <p className="text-sm text-gray-600">
              Criado em {formatDate(contrato.created_at!)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ContratoStatus status={contrato.status} />
            {onEdit && (
              <button
                onClick={() => onEdit(contrato)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(contrato)}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </button>
            )}
          </div>
        </div>

        {/* Contract Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Property Info */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Home className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Imóvel</h3>
              <p className="text-sm text-gray-600">
                {contrato.imovel?.endereco || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                {contrato.imovel?.cidade?.nome || 'N/A'}
              </p>
            </div>
          </div>

          {/* Tenant Info */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Inquilino</h3>
              <p className="text-sm text-gray-600">
                {contrato.inquilino?.nome || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                {contrato.inquilino?.email || contrato.inquilino?.telefone || 'N/A'}
              </p>
            </div>
          </div>

          {/* Owner Info */}
          {contrato.proprietario && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-gray-400 mt-1" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Proprietário</h3>
                <p className="text-sm text-gray-600">
                  {contrato.proprietario.nome}
                </p>
                <p className="text-xs text-gray-500">
                  {contrato.proprietario.email || contrato.proprietario.telefone || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Financial Info */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <DollarSign className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Valores</h3>
              <p className="text-sm text-gray-600">
                Aluguel: {formatCurrency(contrato.valor_aluguel)}
              </p>
              {contrato.valor_deposito && (
                <p className="text-xs text-gray-500">
                  Depósito: {formatCurrency(contrato.valor_deposito)}
                </p>
              )}
            </div>
          </div>

          {/* Contract Period */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Calendar className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Período</h3>
              <p className="text-sm text-gray-600">
                {formatDate(contrato.data_inicio)} até {formatDate(contrato.data_fim)}
              </p>
              <p className="text-xs text-gray-500">
                Vencimento: Dia {contrato.dia_vencimento}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-gray-400 mt-1" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Duração</h3>
              <p className="text-sm text-gray-600">
                {Math.ceil(
                  (new Date(contrato.data_fim).getTime() - new Date(contrato.data_inicio).getTime()) 
                  / (1000 * 60 * 60 * 24 * 30)
                )} meses
              </p>
            </div>
          </div>
        </div>

        {/* Observations */}
        {contrato.observacoes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-400 mt-1" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Observações</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {contrato.observacoes}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      {contractSummary && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Resumo Financeiro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-800">Total Pago</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(contractSummary.totalPago)}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">Total Pendente</div>
              <div className="text-2xl font-bold text-yellow-900">
                {formatCurrency(contractSummary.totalPendente)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-red-800">Juros e Multas</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(contractSummary.totalJurosMultas)}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Pagamentos Atrasados</div>
              <div className="text-2xl font-bold text-blue-900">
                {contractSummary.pagamentosAtrasados}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-medium text-gray-900">
              Histórico de Pagamentos
            </h3>
            {showPaymentHistory ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        {showPaymentHistory && (
          <div className="p-6">
            {pagamentosLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner text="Carregando histórico..." />
              </div>
            ) : !pagamentos || pagamentos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum pagamento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mês Referência
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Devido
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Pago
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vencimento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Pagamento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Juros/Multa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pagamentos.map((pagamento) => (
                      <tr key={pagamento.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(pagamento.mes_referencia).toLocaleDateString('pt-BR', {
                            month: 'long',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(pagamento.valor_devido)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pagamento.valor_pago ? formatCurrency(pagamento.valor_pago) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(pagamento.data_vencimento)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pagamento.data_pagamento ? formatDate(pagamento.data_pagamento) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pagamento.valor_juros + pagamento.valor_multa > 0
                            ? formatCurrency(pagamento.valor_juros + pagamento.valor_multa)
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pagamento.status === 'pago'
                              ? 'bg-green-100 text-green-800'
                              : pagamento.status === 'atrasado'
                              ? 'bg-red-100 text-red-800'
                              : pagamento.status === 'pendente'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {PAGAMENTO_STATUS_LABELS[pagamento.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}