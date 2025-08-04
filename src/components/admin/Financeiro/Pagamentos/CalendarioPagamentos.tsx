'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPagamentos } from '@/lib/api/pagamentos'
import { PagamentoAluguel, PAGAMENTO_STATUS_LABELS } from '@/types/financeiro'
import { LoadingSpinner } from '@/components/admin/Common/LoadingSpinner'
import { Modal } from '@/components/admin/Common/Modal'
import PagamentoForm from './PagamentoForm'

interface CalendarioPagamentosProps {
  contratoId?: string
  onPagamentoSelect?: (pagamento: PagamentoAluguel) => void
}

export default function CalendarioPagamentos({ 
  contratoId, 
  onPagamentoSelect 
}: CalendarioPagamentosProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPagamento, setSelectedPagamento] = useState<PagamentoAluguel | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Calcular primeiro e último dia do mês atual
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate])

  const lastDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  }, [currentDate])

  // Buscar pagamentos do mês
  const { data: pagamentos, isLoading, error, refetch } = useQuery({
    queryKey: ['pagamentos-calendario', currentDate.getFullYear(), currentDate.getMonth(), contratoId],
    queryFn: () => fetchPagamentos({
      filters: {
        data_vencimento_inicio: firstDayOfMonth.toISOString().split('T')[0],
        data_vencimento_fim: lastDayOfMonth.toISOString().split('T')[0],
        contrato_id: contratoId
      },
      limit: 100
    }),
    staleTime: 1000 * 60 * 5 // 5 minutos
  })

  // Organizar pagamentos por dia
  const pagamentosPorDia = useMemo(() => {
    if (!pagamentos) return {}
    
    return pagamentos.reduce((acc, pagamento) => {
      const dia = new Date(pagamento.data_vencimento).getDate()
      if (!acc[dia]) {
        acc[dia] = []
      }
      acc[dia].push(pagamento)
      return acc
    }, {} as Record<number, PagamentoAluguel[]>)
  }, [pagamentos])

  // Gerar dias do calendário
  const diasCalendario = useMemo(() => {
    const dias = []
    const primeiroDia = new Date(firstDayOfMonth)
    const ultimoDia = new Date(lastDayOfMonth)
    
    // Ajustar para começar na segunda-feira
    const diaSemanaInicio = primeiroDia.getDay()
    const diasAnteriores = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1
    
    // Adicionar dias do mês anterior
    for (let i = diasAnteriores; i > 0; i--) {
      const dia = new Date(primeiroDia)
      dia.setDate(dia.getDate() - i)
      dias.push({
        data: dia,
        isCurrentMonth: false,
        pagamentos: []
      })
    }
    
    // Adicionar dias do mês atual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const data = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia)
      dias.push({
        data,
        isCurrentMonth: true,
        pagamentos: pagamentosPorDia[dia] || []
      })
    }
    
    // Completar com dias do próximo mês para formar semanas completas
    const totalDias = dias.length
    const diasRestantes = 42 - totalDias // 6 semanas * 7 dias
    
    for (let i = 1; i <= diasRestantes; i++) {
      const dia = new Date(ultimoDia)
      dia.setDate(dia.getDate() + i)
      dias.push({
        data: dia,
        isCurrentMonth: false,
        pagamentos: []
      })
    }
    
    return dias
  }, [currentDate, pagamentosPorDia])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handlePagamentoClick = (pagamento: PagamentoAluguel) => {
    if (onPagamentoSelect) {
      onPagamentoSelect(pagamento)
    } else {
      setSelectedPagamento(pagamento)
      setShowForm(true)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pago: 'bg-green-100 text-green-800 border-green-200',
      atrasado: 'bg-red-100 text-red-800 border-red-200',
      cancelado: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status as keyof typeof colors] || colors.pendente
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const isToday = (data: Date) => {
    const hoje = new Date()
    return data.toDateString() === hoje.toDateString()
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Erro ao carregar pagamentos: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do calendário */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-gray-600">
            {pagamentos?.length || 0} pagamento(s) no mês
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
          >
            Hoje
          </button>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-200 rounded mr-2"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-200 rounded mr-2"></div>
          <span>Pago</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-200 rounded mr-2"></div>
          <span>Atrasado</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-200 rounded mr-2"></div>
          <span>Cancelado</span>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia) => (
            <div key={dia} className="p-3 text-center text-sm font-medium text-gray-700">
              {dia}
            </div>
          ))}
        </div>

        {/* Dias do calendário */}
        <div className="grid grid-cols-7">
          {diasCalendario.map((diaInfo, index) => (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                !diaInfo.isCurrentMonth ? 'bg-gray-50' : ''
              } ${isToday(diaInfo.data) ? 'bg-blue-50' : ''}`}
            >
              {/* Número do dia */}
              <div className={`text-sm font-medium mb-2 ${
                !diaInfo.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              } ${isToday(diaInfo.data) ? 'text-blue-600' : ''}`}>
                {diaInfo.data.getDate()}
              </div>

              {/* Pagamentos do dia */}
              <div className="space-y-1">
                {diaInfo.pagamentos.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    onClick={() => handlePagamentoClick(pagamento)}
                    className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 border ${getStatusColor(pagamento.status)}`}
                    title={`${pagamento.contrato?.inquilino?.nome} - ${formatCurrency(pagamento.valor_devido)}`}
                  >
                    <div className="font-medium truncate">
                      {pagamento.contrato?.inquilino?.nome || 'Inquilino'}
                    </div>
                    <div className="truncate">
                      {formatCurrency(pagamento.valor_devido)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Pagamentos</div>
          <div className="text-2xl font-bold text-gray-900">
            {pagamentos?.length || 0}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pagos</div>
          <div className="text-2xl font-bold text-green-600">
            {pagamentos?.filter(p => p.status === 'pago').length || 0}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-600">
            {pagamentos?.filter(p => p.status === 'pendente').length || 0}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Atrasados</div>
          <div className="text-2xl font-bold text-red-600">
            {pagamentos?.filter(p => p.status === 'atrasado').length || 0}
          </div>
        </div>
      </div>

      {/* Valor total do mês */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo Financeiro do Mês</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Valor Total Devido</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(pagamentos?.reduce((acc, p) => acc + p.valor_devido, 0) || 0)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Valor Total Pago</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(pagamentos?.reduce((acc, p) => acc + (p.valor_pago || 0), 0) || 0)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Juros e Multas</div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(pagamentos?.reduce((acc, p) => acc + p.valor_juros + p.valor_multa, 0) || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Modal do formulário */}
      {showForm && selectedPagamento && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setSelectedPagamento(null)
          }}
          title="Editar Pagamento"
          size="lg"
        >
          <PagamentoForm
            pagamento={selectedPagamento}
            onSuccess={(message) => {
              setShowForm(false)
              setSelectedPagamento(null)
              refetch()
            }}
            onError={(message) => {
              console.error('Erro no formulário:', message)
            }}
            onCancel={() => {
              setShowForm(false)
              setSelectedPagamento(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}