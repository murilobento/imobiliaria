'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { processarVencimentosDiarios, getPagamentosVencidos, getConfiguracaoFinanceira } from '@/lib/api/pagamentos'
import { ProcessamentoVencimento } from '@/types/financeiro'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'
import { ToastContainer, useToast } from '@/components/admin/Common/Toast'

interface ProcessarVencimentosProps {
  onProcessamentoComplete?: (resultado: ProcessamentoVencimento) => void
}

export default function ProcessarVencimentos({ onProcessamentoComplete }: ProcessarVencimentosProps) {
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().split('T')[0])
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
  const [ultimoResultado, setUltimoResultado] = useState<ProcessamentoVencimento | null>(null)

  // Buscar configurações financeiras
  const { data: configuracao, isLoading: loadingConfig } = useQuery({
    queryKey: ['configuracao-financeira'],
    queryFn: getConfiguracaoFinanceira
  })

  // Buscar pagamentos vencidos
  const { data: pagamentosVencidos, isLoading: loadingVencidos, refetch: refetchVencidos } = useQuery({
    queryKey: ['pagamentos-vencidos', dataReferencia],
    queryFn: () => getPagamentosVencidos(new Date(dataReferencia)),
    enabled: !!dataReferencia
  })

  // Mutation para processar vencimentos
  const processarMutation = useMutation({
    mutationFn: (data: Date) => processarVencimentosDiarios(data),
    onSuccess: (resultado) => {
      setUltimoResultado(resultado)
      
      if (resultado.erros.length > 0) {
        showError(
          'Processamento Concluído com Erros',
          `${resultado.erros.length} erro(s) encontrado(s). Verifique os detalhes.`
        )
      } else {
        showSuccess(
          'Processamento Concluído',
          `${resultado.pagamentos_processados} pagamento(s) processado(s) com sucesso.`
        )
      }
      
      // Atualizar lista de vencidos
      refetchVencidos()
      
      if (onProcessamentoComplete) {
        onProcessamentoComplete(resultado)
      }
    },
    onError: (error) => {
      showError('Erro no Processamento', `Erro ao processar vencimentos: ${error.message}`)
    }
  })

  const handleProcessar = () => {
    if (!dataReferencia) {
      showError('Dados Incompletos', 'Selecione uma data de referência')
      return
    }

    processarMutation.mutate(new Date(dataReferencia))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const calcularDiasAtraso = (dataVencimento: string, dataReferencia: string) => {
    const vencimento = new Date(dataVencimento)
    const referencia = new Date(dataReferencia)
    const diffTime = referencia.getTime() - vencimento.getTime()
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  }

  if (loadingConfig) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Processar Vencimentos</h2>
        <p className="text-gray-600">
          Processe automaticamente pagamentos vencidos, aplicando juros e multas conforme configurado
        </p>
      </div>

      {/* Configurações atuais */}
      {configuracao && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Configurações Atuais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Taxa de Juros:</span>
              <div className="text-blue-900">{(configuracao.taxa_juros_mensal * 100).toFixed(2)}% ao mês</div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Taxa de Multa:</span>
              <div className="text-blue-900">{(configuracao.taxa_multa * 100).toFixed(2)}%</div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Dias de Carência:</span>
              <div className="text-blue-900">{configuracao.dias_carencia} dias</div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Taxa de Comissão:</span>
              <div className="text-blue-900">{(configuracao.taxa_comissao * 100).toFixed(2)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de processamento */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Processar Vencimentos</h3>
        
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Referência
            </label>
            <input
              type="date"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Pagamentos com vencimento até esta data serão processados
            </p>
          </div>
          
          <button
            onClick={handleProcessar}
            disabled={processarMutation.isPending || !dataReferencia}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processarMutation.isPending ? 'Processando...' : 'Processar'}
          </button>
        </div>
      </div>

      {/* Pagamentos vencidos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Pagamentos Vencidos
            </h3>
            <span className="text-sm text-gray-500">
              {loadingVencidos ? 'Carregando...' : `${pagamentosVencidos?.length || 0} pagamento(s)`}
            </span>
          </div>
        </div>

        {loadingVencidos ? (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        ) : pagamentosVencidos && pagamentosVencidos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imóvel/Inquilino
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dias Atraso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Devido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Juros/Multa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagamentosVencidos.map((pagamento) => {
                  const diasAtraso = calcularDiasAtraso(pagamento.data_vencimento, dataReferencia)
                  const totalJurosMulta = pagamento.valor_juros + pagamento.valor_multa
                  
                  return (
                    <tr key={pagamento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {pagamento.contrato?.imovel?.endereco || 'Imóvel não encontrado'}
                          </div>
                          <div className="text-gray-500">
                            {pagamento.contrato?.inquilino?.nome || 'Inquilino não encontrado'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(pagamento.data_vencimento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          diasAtraso > 30 ? 'bg-red-100 text-red-800' :
                          diasAtraso > 15 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {diasAtraso} dias
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(pagamento.valor_devido)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {totalJurosMulta > 0 ? formatCurrency(totalJurosMulta) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pagamento.status === 'atrasado' ? 'bg-red-100 text-red-800' :
                          pagamento.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pagamento.status === 'atrasado' ? 'Atrasado' :
                           pagamento.status === 'pendente' ? 'Pendente' : 'Outro'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Nenhum pagamento vencido encontrado para a data selecionada
          </div>
        )}
      </div>

      {/* Resultado do último processamento */}
      {ultimoResultado && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resultado do Processamento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Pagamentos Processados</div>
              <div className="text-2xl font-bold text-blue-900">
                {ultimoResultado.pagamentos_processados}
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600">Pagamentos Vencidos</div>
              <div className="text-2xl font-bold text-red-900">
                {ultimoResultado.pagamentos_vencidos}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Notificações Enviadas</div>
              <div className="text-2xl font-bold text-green-900">
                {ultimoResultado.notificacoes_enviadas}
              </div>
            </div>
          </div>

          {/* Erros */}
          {ultimoResultado.erros.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Erros Encontrados ({ultimoResultado.erros.length})
              </h4>
              <div className="space-y-1">
                {ultimoResultado.erros.map((erro, index) => (
                  <div key={index} className="text-sm text-red-700">
                    • {erro}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Informações sobre o processamento */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Como funciona o processamento:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Busca todos os pagamentos pendentes com vencimento até a data selecionada</li>
          <li>• Calcula juros e multa baseado nas configurações atuais</li>
          <li>• Atualiza o status para "atrasado" se passou do período de carência</li>
          <li>• Registra logs de auditoria para todas as operações</li>
          <li>• Envia notificações automáticas (quando configurado)</li>
        </ul>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}