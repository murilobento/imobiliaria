'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  PagamentoAluguel, 
  PagamentoFormData, 
  PAGAMENTO_STATUS, 
  PAGAMENTO_STATUS_LABELS,
  CreatePagamentoData,
  UpdatePagamentoData
} from '@/types/financeiro'
import { 
  createPagamento, 
  updatePagamento, 
  checkContratoExists,
  getConfiguracaoFinanceira 
} from '@/lib/api/pagamentos'
import { fetchContratos } from '@/lib/api/contratos'
import { CalculoFinanceiroService } from '@/lib/services/calculoFinanceiro'
import LoadingSpinner from '@/components/admin/Common/LoadingSpinner'

interface PagamentoFormProps {
  pagamento?: PagamentoAluguel | null
  contratoId?: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onCancel: () => void
}

export default function PagamentoForm({
  pagamento,
  contratoId,
  onSuccess,
  onError,
  onCancel
}: PagamentoFormProps) {
  const [formData, setFormData] = useState<PagamentoFormData>({
    contrato_id: contratoId || '',
    mes_referencia: '',
    valor_devido: '',
    valor_pago: '',
    data_vencimento: '',
    data_pagamento: '',
    valor_juros: '0',
    valor_multa: '0',
    status: PAGAMENTO_STATUS.PENDENTE,
    observacoes: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculoAutomatico, setCalculoAutomatico] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Buscar contratos para seleção
  const { data: contratos, isLoading: loadingContratos } = useQuery({
    queryKey: ['contratos-select'],
    queryFn: () => fetchContratos({ limit: 100, filters: { status: 'ativo' } }),
    enabled: !contratoId // Só busca se não foi fornecido um contratoId específico
  })

  // Buscar configurações financeiras
  const { data: configuracao } = useQuery({
    queryKey: ['configuracao-financeira'],
    queryFn: getConfiguracaoFinanceira
  })

  // Preencher formulário se editando
  useEffect(() => {
    if (pagamento) {
      setFormData({
        contrato_id: pagamento.contrato_id,
        mes_referencia: pagamento.mes_referencia,
        valor_devido: pagamento.valor_devido.toString(),
        valor_pago: pagamento.valor_pago?.toString() || '',
        data_vencimento: pagamento.data_vencimento,
        data_pagamento: pagamento.data_pagamento || '',
        valor_juros: pagamento.valor_juros.toString(),
        valor_multa: pagamento.valor_multa.toString(),
        status: pagamento.status,
        observacoes: pagamento.observacoes || ''
      })
    }
  }, [pagamento])

  // Calcular juros e multa automaticamente
  useEffect(() => {
    if (calculoAutomatico && configuracao && formData.data_vencimento && formData.data_pagamento && formData.valor_devido) {
      const dataVencimento = new Date(formData.data_vencimento)
      const dataPagamento = new Date(formData.data_pagamento)
      const valorDevido = parseFloat(formData.valor_devido)

      if (dataPagamento > dataVencimento && valorDevido > 0) {
        const diasAtraso = Math.floor(
          (dataPagamento.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
        )

        try {
          const calculo = CalculoFinanceiroService.calcularJurosMulta(
            valorDevido,
            diasAtraso,
            configuracao.taxa_juros_mensal,
            configuracao.taxa_multa,
            configuracao.dias_carencia
          )

          setFormData(prev => ({
            ...prev,
            valor_juros: calculo.juros.toString(),
            valor_multa: calculo.multa.toString()
          }))
        } catch (error) {
          console.error('Erro ao calcular juros e multa:', error)
        }
      } else {
        // Pagamento em dia ou antecipado
        setFormData(prev => ({
          ...prev,
          valor_juros: '0',
          valor_multa: '0'
        }))
      }
    }
  }, [formData.data_vencimento, formData.data_pagamento, formData.valor_devido, calculoAutomatico, configuracao])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.contrato_id) {
      newErrors.contrato_id = 'Contrato é obrigatório'
    }

    if (!formData.mes_referencia) {
      newErrors.mes_referencia = 'Mês de referência é obrigatório'
    }

    if (!formData.valor_devido || parseFloat(formData.valor_devido) <= 0) {
      newErrors.valor_devido = 'Valor devido deve ser maior que zero'
    }

    if (!formData.data_vencimento) {
      newErrors.data_vencimento = 'Data de vencimento é obrigatória'
    }

    if (formData.valor_pago && parseFloat(formData.valor_pago) < 0) {
      newErrors.valor_pago = 'Valor pago não pode ser negativo'
    }

    if (formData.data_pagamento && formData.status === PAGAMENTO_STATUS.PENDENTE) {
      newErrors.status = 'Status deve ser "Pago" quando há data de pagamento'
    }

    if (!formData.data_pagamento && formData.status === PAGAMENTO_STATUS.PAGO) {
      newErrors.data_pagamento = 'Data de pagamento é obrigatória quando status é "Pago"'
    }

    if (parseFloat(formData.valor_juros) < 0) {
      newErrors.valor_juros = 'Valor de juros não pode ser negativo'
    }

    if (parseFloat(formData.valor_multa) < 0) {
      newErrors.valor_multa = 'Valor de multa não pode ser negativo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Verificar se contrato existe
      if (!await checkContratoExists(formData.contrato_id)) {
        onError('Contrato não encontrado')
        return
      }

      const data = {
        contrato_id: formData.contrato_id,
        mes_referencia: formData.mes_referencia,
        valor_devido: parseFloat(formData.valor_devido),
        valor_pago: formData.valor_pago ? parseFloat(formData.valor_pago) : undefined,
        data_vencimento: formData.data_vencimento,
        data_pagamento: formData.data_pagamento || undefined,
        valor_juros: parseFloat(formData.valor_juros),
        valor_multa: parseFloat(formData.valor_multa),
        status: formData.status,
        observacoes: formData.observacoes || undefined
      }

      if (pagamento) {
        // Atualizar pagamento existente
        const updateData: UpdatePagamentoData = { id: pagamento.id!, ...data }
        await updatePagamento(pagamento.id!, updateData)
        onSuccess('Pagamento atualizado com sucesso!')
      } else {
        // Criar novo pagamento
        const createData: CreatePagamentoData = data
        await createPagamento(createData)
        onSuccess('Pagamento criado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error)
      onError(error instanceof Error ? error.message : 'Erro ao salvar pagamento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof PagamentoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getValorTotal = () => {
    const valorDevido = parseFloat(formData.valor_devido) || 0
    const valorJuros = parseFloat(formData.valor_juros) || 0
    const valorMulta = parseFloat(formData.valor_multa) || 0
    return valorDevido + valorJuros + valorMulta
  }

  if (loadingContratos && !contratoId) {
    return <LoadingSpinner />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seleção de Contrato */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contrato *
        </label>
        {contratoId ? (
          <input
            type="text"
            value="Contrato pré-selecionado"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        ) : (
          <select
            value={formData.contrato_id}
            onChange={(e) => handleInputChange('contrato_id', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.contrato_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione um contrato</option>
            {contratos?.map((contrato) => (
              <option key={contrato.id} value={contrato.id}>
                {contrato.imovel?.endereco} - {contrato.inquilino?.nome}
              </option>
            ))}
          </select>
        )}
        {errors.contrato_id && (
          <p className="mt-1 text-sm text-red-600">{errors.contrato_id}</p>
        )}
      </div>

      {/* Dados básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mês de Referência *
          </label>
          <input
            type="month"
            value={formData.mes_referencia.substring(0, 7)}
            onChange={(e) => handleInputChange('mes_referencia', e.target.value + '-01')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.mes_referencia ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.mes_referencia && (
            <p className="mt-1 text-sm text-red-600">{errors.mes_referencia}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.status ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {Object.entries(PAGAMENTO_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
          )}
        </div>
      </div>

      {/* Valores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Devido *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_devido}
            onChange={(e) => handleInputChange('valor_devido', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.valor_devido ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0,00"
          />
          {errors.valor_devido && (
            <p className="mt-1 text-sm text-red-600">{errors.valor_devido}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Pago
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_pago}
            onChange={(e) => handleInputChange('valor_pago', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.valor_pago ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0,00"
          />
          {errors.valor_pago && (
            <p className="mt-1 text-sm text-red-600">{errors.valor_pago}</p>
          )}
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Vencimento *
          </label>
          <input
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.data_vencimento ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.data_vencimento && (
            <p className="mt-1 text-sm text-red-600">{errors.data_vencimento}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Pagamento
          </label>
          <input
            type="date"
            value={formData.data_pagamento}
            onChange={(e) => handleInputChange('data_pagamento', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.data_pagamento ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.data_pagamento && (
            <p className="mt-1 text-sm text-red-600">{errors.data_pagamento}</p>
          )}
        </div>
      </div>

      {/* Juros e Multa */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Juros e Multa</h3>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={calculoAutomatico}
              onChange={(e) => setCalculoAutomatico(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Cálculo automático</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor de Juros
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_juros}
              onChange={(e) => handleInputChange('valor_juros', e.target.value)}
              disabled={calculoAutomatico}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                calculoAutomatico ? 'bg-gray-50' : ''
              } ${errors.valor_juros ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0,00"
            />
            {errors.valor_juros && (
              <p className="mt-1 text-sm text-red-600">{errors.valor_juros}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor de Multa
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_multa}
              onChange={(e) => handleInputChange('valor_multa', e.target.value)}
              disabled={calculoAutomatico}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                calculoAutomatico ? 'bg-gray-50' : ''
              } ${errors.valor_multa ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0,00"
            />
            {errors.valor_multa && (
              <p className="mt-1 text-sm text-red-600">{errors.valor_multa}</p>
            )}
          </div>
        </div>

        {/* Resumo dos valores */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Resumo</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Valor devido:</span>
              <span>{formatCurrency(parseFloat(formData.valor_devido) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Juros:</span>
              <span>{formatCurrency(parseFloat(formData.valor_juros) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Multa:</span>
              <span>{formatCurrency(parseFloat(formData.valor_multa) || 0)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Total:</span>
              <span>{formatCurrency(getValorTotal())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          value={formData.observacoes}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Observações adicionais sobre o pagamento..."
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvando...' : pagamento ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}