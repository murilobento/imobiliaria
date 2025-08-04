import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { DespesaImovel, CreateDespesaData, DespesaFilters } from '../../types/financeiro'

export interface DespesasListParams {
  page?: number
  limit?: number
  search?: string
  orderBy?: 'valor' | 'data_despesa' | 'data_pagamento' | 'created_at'
  orderDirection?: 'asc' | 'desc'
  filters?: DespesaFilters
}

export interface DespesasListResponse {
  data: DespesaImovel[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Função para buscar todas as despesas (sem cache)
export async function fetchDespesas(params: DespesasListParams = {}): Promise<DespesaImovel[]> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {}
  } = params

  let query = supabase
    .from('despesas_imoveis')
    .select(`
      *,
      imovel:imoveis(*)
    `, { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`descricao.ilike.%${search}%,observacoes.ilike.%${search}%`)
  }

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.categoria) {
    query = query.eq('categoria', filters.categoria)
  }
  if (filters.imovel_id) {
    query = query.eq('imovel_id', filters.imovel_id)
  }
  if (filters.data_inicio) {
    query = query.gte('data_despesa', filters.data_inicio)
  }
  if (filters.data_fim) {
    query = query.lte('data_despesa', filters.data_fim)
  }
  if (filters.valor_min) {
    query = query.gte('valor', filters.valor_min)
  }
  if (filters.valor_max) {
    query = query.lte('valor', filters.valor_max)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao buscar despesas: ${error.message}`)
  }

  return data || []
}

// Função para buscar despesas com resposta de API formatada
export async function getDespesasList(params: DespesasListParams = {}): Promise<DespesasListResponse> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {}
  } = params

  let query = supabase
    .from('despesas_imoveis')
    .select(`
      *,
      imovel:imoveis(*)
    `, { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`descricao.ilike.%${search}%,observacoes.ilike.%${search}%`)
  }

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.categoria) {
    query = query.eq('categoria', filters.categoria)
  }
  if (filters.imovel_id) {
    query = query.eq('imovel_id', filters.imovel_id)
  }
  if (filters.data_inicio) {
    query = query.gte('data_despesa', filters.data_inicio)
  }
  if (filters.data_fim) {
    query = query.lte('data_despesa', filters.data_fim)
  }
  if (filters.valor_min) {
    query = query.gte('valor', filters.valor_min)
  }
  if (filters.valor_max) {
    query = query.lte('valor', filters.valor_max)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Erro ao buscar despesas: ${error.message}`)
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

// Hook para usar despesas com cache
export function useDespesas(params: DespesasListParams = {}) {
  return useQuery<DespesaImovel[], Error>({
    queryKey: ['despesas', params],
    queryFn: () => fetchDespesas(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2
  })
}

// Buscar despesa por ID
export async function getDespesaById(id: string): Promise<DespesaImovel> {
  const { data, error } = await supabase
    .from('despesas_imoveis')
    .select(`
      *,
      imovel:imoveis(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar despesa: ${error.message}`)
  }

  if (!data) {
    throw new Error('Despesa não encontrada')
  }

  return data
}

// Criar nova despesa
export async function createDespesa(despesaData: CreateDespesaData): Promise<DespesaImovel> {
  const { data, error } = await supabase
    .from('despesas_imoveis')
    .insert([despesaData])
    .select(`
      *,
      imovel:imoveis(*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao criar despesa: ${error.message}`)
  }

  return data
}

// Atualizar despesa
export async function updateDespesa(id: string, despesaData: Partial<CreateDespesaData>): Promise<DespesaImovel> {
  const { data, error } = await supabase
    .from('despesas_imoveis')
    .update(despesaData)
    .eq('id', id)
    .select(`
      *,
      imovel:imoveis(*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar despesa: ${error.message}`)
  }

  if (!data) {
    throw new Error('Despesa não encontrada')
  }

  return data
}

// Deletar despesa
export async function deleteDespesa(id: string): Promise<void> {
  const { error } = await supabase
    .from('despesas_imoveis')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao deletar despesa: ${error.message}`)
  }
}

// Verificar se imóvel existe
export async function checkImovelExists(imovelId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('imoveis')
    .select('id')
    .eq('id', imovelId)
    .single()

  if (error) {
    return false
  }

  return !!data
}

// Buscar despesas por imóvel
export async function getDespesasByImovel(imovelId: string): Promise<DespesaImovel[]> {
  const { data, error } = await supabase
    .from('despesas_imoveis')
    .select(`
      *,
      imovel:imoveis(*)
    `)
    .eq('imovel_id', imovelId)
    .order('data_despesa', { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar despesas do imóvel: ${error.message}`)
  }

  return data || []
}

// Buscar despesas por categoria
export async function getDespesasByCategoria(categoria: string): Promise<DespesaImovel[]> {
  const { data, error } = await supabase
    .from('despesas_imoveis')
    .select(`
      *,
      imovel:imoveis(*)
    `)
    .eq('categoria', categoria)
    .order('data_despesa', { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar despesas por categoria: ${error.message}`)
  }

  return data || []
}

// Calcular total de despesas por período
export async function getTotalDespesasPorPeriodo(
  dataInicio: string,
  dataFim: string,
  imovelId?: string
): Promise<number> {
  let query = supabase
    .from('despesas_imoveis')
    .select('valor')
    .gte('data_despesa', dataInicio)
    .lte('data_despesa', dataFim)
    .eq('status', 'pago')

  if (imovelId) {
    query = query.eq('imovel_id', imovelId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao calcular total de despesas: ${error.message}`)
  }

  return data?.reduce((total, despesa) => total + despesa.valor, 0) || 0
}

// Calcular despesas por categoria em um período
export async function getDespesasPorCategoriaPeriodo(
  dataInicio: string,
  dataFim: string,
  imovelId?: string
): Promise<Record<string, number>> {
  let query = supabase
    .from('despesas_imoveis')
    .select('categoria, valor')
    .gte('data_despesa', dataInicio)
    .lte('data_despesa', dataFim)
    .eq('status', 'pago')

  if (imovelId) {
    query = query.eq('imovel_id', imovelId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao calcular despesas por categoria: ${error.message}`)
  }

  const despesasPorCategoria: Record<string, number> = {}

  data?.forEach(despesa => {
    if (!despesasPorCategoria[despesa.categoria]) {
      despesasPorCategoria[despesa.categoria] = 0
    }
    despesasPorCategoria[despesa.categoria] += despesa.valor
  })

  return despesasPorCategoria
}