import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { PagamentoAluguel, CreatePagamentoData, UpdatePagamentoData, PagamentoFilters, ProcessamentoVencimento, ConfiguracaoFinanceira } from '../../types/financeiro'
import { CalculoFinanceiroService } from '../services/calculoFinanceiro'

export interface PagamentosListParams {
  page?: number
  limit?: number
  search?: string
  orderBy?: 'valor_devido' | 'data_vencimento' | 'data_pagamento' | 'created_at'
  orderDirection?: 'asc' | 'desc'
  filters?: PagamentoFilters
}

export interface PagamentosListResponse {
  data: PagamentoAluguel[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Função para buscar todos os pagamentos (sem cache)
export async function fetchPagamentos(params: PagamentosListParams = {}): Promise<PagamentoAluguel[]> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'data_vencimento',
    orderDirection = 'desc',
    filters = {}
  } = params

  let query = supabase
    .from('pagamentos_aluguel')
    .select(`
      *,
      contrato:contratos_aluguel(
        *,
        imovel:imoveis(*),
        inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*)
      )
    `, { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`observacoes.ilike.%${search}%`)
  }

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.contrato_id) {
    query = query.eq('contrato_id', filters.contrato_id)
  }
  if (filters.mes_referencia) {
    query = query.eq('mes_referencia', filters.mes_referencia)
  }
  if (filters.data_vencimento_inicio) {
    query = query.gte('data_vencimento', filters.data_vencimento_inicio)
  }
  if (filters.data_vencimento_fim) {
    query = query.lte('data_vencimento', filters.data_vencimento_fim)
  }
  if (filters.valor_min) {
    query = query.gte('valor_devido', filters.valor_min)
  }
  if (filters.valor_max) {
    query = query.lte('valor_devido', filters.valor_max)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao buscar pagamentos: ${error.message}`)
  }

  return data || []
}

// Função para buscar pagamentos com resposta de API formatada
export async function getPagamentosList(params: PagamentosListParams = {}): Promise<PagamentosListResponse> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'data_vencimento',
    orderDirection = 'desc',
    filters = {}
  } = params

  let query = supabase
    .from('pagamentos_aluguel')
    .select(`
      *,
      contrato:contratos_aluguel(
        *,
        imovel:imoveis(*),
        inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*)
      )
    `, { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`observacoes.ilike.%${search}%`)
  }

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.contrato_id) {
    query = query.eq('contrato_id', filters.contrato_id)
  }
  if (filters.mes_referencia) {
    query = query.eq('mes_referencia', filters.mes_referencia)
  }
  if (filters.data_vencimento_inicio) {
    query = query.gte('data_vencimento', filters.data_vencimento_inicio)
  }
  if (filters.data_vencimento_fim) {
    query = query.lte('data_vencimento', filters.data_vencimento_fim)
  }
  if (filters.valor_min) {
    query = query.gte('valor_devido', filters.valor_min)
  }
  if (filters.valor_max) {
    query = query.lte('valor_devido', filters.valor_max)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Erro ao buscar pagamentos: ${error.message}`)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: data || [],
    total,
    page,
    limit,
    totalPages
  }
}

// Hook para usar pagamentos com cache
export function usePagamentos(params: PagamentosListParams = {}) {
  return useQuery<PagamentoAluguel[], Error>({
    queryKey: ['pagamentos', params],
    queryFn: () => fetchPagamentos(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2
  })
}

// Buscar pagamento por ID
export async function getPagamentoById(id: string): Promise<PagamentoAluguel> {
  const { data, error } = await supabase
    .from('pagamentos_aluguel')
    .select(`
      *,
      contrato:contratos_aluguel(
        *,
        imovel:imoveis(*),
        inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
        proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar pagamento: ${error.message}`)
  }

  if (!data) {
    throw new Error('Pagamento não encontrado')
  }

  return data
}

// Criar novo pagamento
export async function createPagamento(pagamentoData: CreatePagamentoData): Promise<PagamentoAluguel> {
  // Buscar configurações financeiras para calcular juros e multa automaticamente
  const configuracao = await getConfiguracaoFinanceira()
  
  // Se há data de pagamento e está em atraso, calcular juros e multa
  if (pagamentoData.data_pagamento && pagamentoData.data_vencimento) {
    const dataVencimento = new Date(pagamentoData.data_vencimento)
    const dataPagamento = new Date(pagamentoData.data_pagamento)
    
    if (dataPagamento > dataVencimento) {
      const diasAtraso = Math.floor(
        (dataPagamento.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      const calculo = CalculoFinanceiroService.calcularJurosMulta(
        pagamentoData.valor_devido,
        diasAtraso,
        configuracao.taxa_juros_mensal,
        configuracao.taxa_multa,
        configuracao.dias_carencia
      )
      
      pagamentoData.valor_juros = calculo.juros
      pagamentoData.valor_multa = calculo.multa
    }
  }

  const { data, error } = await supabase
    .from('pagamentos_aluguel')
    .insert([pagamentoData])
    .select(`
      *,
      contrato:contratos_aluguel(
        *,
        imovel:imoveis(*),
        inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*)
      )
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao criar pagamento: ${error.message}`)
  }

  return data
}

// Atualizar pagamento
export async function updatePagamento(id: string, pagamentoData: UpdatePagamentoData): Promise<PagamentoAluguel> {
  // Buscar configurações financeiras para recalcular juros e multa se necessário
  const configuracao = await getConfiguracaoFinanceira()
  
  // Se está atualizando data de pagamento ou vencimento, recalcular juros e multa
  if (pagamentoData.data_pagamento || pagamentoData.data_vencimento) {
    // Buscar dados atuais do pagamento
    const pagamentoAtual = await getPagamentoById(id)
    
    const dataVencimento = new Date(pagamentoData.data_vencimento || pagamentoAtual.data_vencimento)
    const dataPagamento = pagamentoData.data_pagamento 
      ? new Date(pagamentoData.data_pagamento)
      : pagamentoAtual.data_pagamento 
        ? new Date(pagamentoAtual.data_pagamento)
        : null
    
    if (dataPagamento && dataPagamento > dataVencimento) {
      const diasAtraso = Math.floor(
        (dataPagamento.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      const valorDevido = pagamentoData.valor_devido || pagamentoAtual.valor_devido
      
      const calculo = CalculoFinanceiroService.calcularJurosMulta(
        valorDevido,
        diasAtraso,
        configuracao.taxa_juros_mensal,
        configuracao.taxa_multa,
        configuracao.dias_carencia
      )
      
      pagamentoData.valor_juros = calculo.juros
      pagamentoData.valor_multa = calculo.multa
    } else if (dataPagamento && dataPagamento <= dataVencimento) {
      // Pagamento em dia ou antecipado - zerar juros e multa
      pagamentoData.valor_juros = 0
      pagamentoData.valor_multa = 0
    }
  }

  const { data, error } = await supabase
    .from('pagamentos_aluguel')
    .update(pagamentoData)
    .eq('id', id)
    .select(`
      *,
      contrato:contratos_aluguel(
        *,
        imovel:imoveis(*),
        inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*)
      )
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar pagamento: ${error.message}`)
  }

  if (!data) {
    throw new Error('Pagamento não encontrado')
  }

  return data
}

// Deletar pagamento
export async function deletePagamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('pagamentos_aluguel')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao deletar pagamento: ${error.message}`)
  }
}

// Verificar se contrato existe
export async function checkContratoExists(contratoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('contratos_aluguel')
    .select('id')
    .eq('id', contratoId)
    .single()

  if (error) {
    return false
  }

  return !!data
}

// Buscar configuração financeira
export async function getConfiguracaoFinanceira(): Promise<ConfiguracaoFinanceira> {
  const { data, error } = await supabase
    .from('configuracoes_financeiras')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    // Retornar configuração padrão se não encontrar
    return {
      taxa_juros_mensal: 0.01, // 1% ao mês
      taxa_multa: 0.02, // 2%
      taxa_comissao: 0.10, // 10%
      dias_carencia: 5
    }
  }

  return data
}

// Processar vencimentos diários
export async function processarVencimentosDiarios(dataReferencia: Date = new Date()): Promise<ProcessamentoVencimento> {
  const resultado: ProcessamentoVencimento = {
    pagamentos_processados: 0,
    pagamentos_vencidos: 0,
    notificacoes_enviadas: 0,
    erros: []
  }

  try {
    // Buscar configurações financeiras
    const configuracao = await getConfiguracaoFinanceira()
    
    // Buscar pagamentos pendentes que podem estar vencidos
    const { data: pagamentosPendentes, error } = await supabase
      .from('pagamentos_aluguel')
      .select(`
        *,
        contrato:contratos_aluguel(*)
      `)
      .eq('status', 'pendente')
      .lte('data_vencimento', dataReferencia.toISOString().split('T')[0])

    if (error) {
      resultado.erros.push(`Erro ao buscar pagamentos pendentes: ${error.message}`)
      return resultado
    }

    if (!pagamentosPendentes || pagamentosPendentes.length === 0) {
      return resultado
    }

    // Processar cada pagamento
    for (const pagamento of pagamentosPendentes) {
      try {
        const dataVencimento = new Date(pagamento.data_vencimento)
        const diasAtraso = Math.floor(
          (dataReferencia.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diasAtraso > configuracao.dias_carencia) {
          // Calcular juros e multa
          const calculo = CalculoFinanceiroService.calcularJurosMulta(
            pagamento.valor_devido,
            diasAtraso,
            configuracao.taxa_juros_mensal,
            configuracao.taxa_multa,
            configuracao.dias_carencia
          )

          // Atualizar pagamento com juros, multa e status
          const { error: updateError } = await supabase
            .from('pagamentos_aluguel')
            .update({
              valor_juros: calculo.juros,
              valor_multa: calculo.multa,
              status: 'atrasado',
              updated_at: new Date().toISOString()
            })
            .eq('id', pagamento.id)

          if (updateError) {
            resultado.erros.push(`Erro ao atualizar pagamento ${pagamento.id}: ${updateError.message}`)
          } else {
            resultado.pagamentos_processados++
            resultado.pagamentos_vencidos++
            
            // TODO: Implementar envio de notificações
            // await enviarNotificacaoAtraso(pagamento)
            resultado.notificacoes_enviadas++
          }
        } else {
          // Ainda dentro da carência, apenas contar como processado
          resultado.pagamentos_processados++
        }
      } catch (error) {
        resultado.erros.push(`Erro ao processar pagamento ${pagamento.id}: ${error}`)
      }
    }

  } catch (error) {
    resultado.erros.push(`Erro geral no processamento: ${error}`)
  }

  return resultado
}

// Buscar pagamentos por contrato
export async function getPagamentosByContrato(contratoId: string): Promise<PagamentoAluguel[]> {
  const { data, error } = await supabase
    .from('pagamentos_aluguel')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('data_vencimento', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar pagamentos do contrato: ${error.message}`)
  }

  return data || []
}

// Buscar pagamentos vencidos
export async function getPagamentosVencidos(dataReferencia: Date = new Date()): Promise<PagamentoAluguel[]> {
  const { data, error } = await supabase
    .from('pagamentos_aluguel')
    .select(`
      *,
      contrato:contratos_aluguel(
        *,
        imovel:imoveis(*),
        inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*)
      )
    `)
    .in('status', ['pendente', 'atrasado'])
    .lt('data_vencimento', dataReferencia.toISOString().split('T')[0])
    .order('data_vencimento', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar pagamentos vencidos: ${error.message}`)
  }

  return data || []
}

// Buscar estatísticas de pagamentos
export async function getEstatisticasPagamentos(
  dataInicio: Date,
  dataFim: Date
): Promise<{
  total_pagamentos: number
  total_pago: number
  total_pendente: number
  total_atrasado: number
  valor_total_devido: number
  valor_total_pago: number
  valor_total_juros: number
  valor_total_multa: number
}> {
  const { data, error } = await supabase
    .from('pagamentos_aluguel')
    .select('*')
    .gte('data_vencimento', dataInicio.toISOString().split('T')[0])
    .lte('data_vencimento', dataFim.toISOString().split('T')[0])

  if (error) {
    throw new Error(`Erro ao buscar estatísticas de pagamentos: ${error.message}`)
  }

  const pagamentos = data || []

  const estatisticas = {
    total_pagamentos: pagamentos.length,
    total_pago: pagamentos.filter(p => p.status === 'pago').length,
    total_pendente: pagamentos.filter(p => p.status === 'pendente').length,
    total_atrasado: pagamentos.filter(p => p.status === 'atrasado').length,
    valor_total_devido: pagamentos.reduce((acc, p) => acc + p.valor_devido, 0),
    valor_total_pago: pagamentos.reduce((acc, p) => acc + (p.valor_pago || 0), 0),
    valor_total_juros: pagamentos.reduce((acc, p) => acc + p.valor_juros, 0),
    valor_total_multa: pagamentos.reduce((acc, p) => acc + p.valor_multa, 0)
  }

  return estatisticas
}