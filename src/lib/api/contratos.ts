import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { ContratoAluguel, CreateContratoData, ContratoFilters } from '../../types/financeiro'

export interface ContratosListParams {
  page?: number
  limit?: number
  search?: string
  orderBy?: 'valor_aluguel' | 'data_inicio' | 'data_fim' | 'created_at'
  orderDirection?: 'asc' | 'desc'
  filters?: ContratoFilters
}

export interface ContratosListResponse {
  data: ContratoAluguel[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Função para buscar todos os contratos (sem cache)
export async function fetchContratos(params: ContratosListParams = {}): Promise<ContratoAluguel[]> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {}
  } = params

  let query = supabase
    .from('contratos_aluguel')
    .select(`
      *,
      imovel:imoveis(*),
      inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
      proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*)
    `, { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`observacoes.ilike.%${search}%`)
  }

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.imovel_id) {
    query = query.eq('imovel_id', filters.imovel_id)
  }
  if (filters.inquilino_id) {
    query = query.eq('inquilino_id', filters.inquilino_id)
  }
  if (filters.data_inicio) {
    query = query.gte('data_inicio', filters.data_inicio)
  }
  if (filters.data_fim) {
    query = query.lte('data_fim', filters.data_fim)
  }
  if (filters.valor_min) {
    query = query.gte('valor_aluguel', filters.valor_min)
  }
  if (filters.valor_max) {
    query = query.lte('valor_aluguel', filters.valor_max)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao buscar contratos: ${error.message}`)
  }

  return data || []
}

// Função para buscar contratos com resposta de API formatada
export async function getContratosList(params: ContratosListParams = {}): Promise<ContratosListResponse> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {}
  } = params

  let query = supabase
    .from('contratos_aluguel')
    .select(`
      *,
      imovel:imoveis(*),
      inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
      proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*)
    `, { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`observacoes.ilike.%${search}%`)
  }

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.imovel_id) {
    query = query.eq('imovel_id', filters.imovel_id)
  }
  if (filters.inquilino_id) {
    query = query.eq('inquilino_id', filters.inquilino_id)
  }
  if (filters.data_inicio) {
    query = query.gte('data_inicio', filters.data_inicio)
  }
  if (filters.data_fim) {
    query = query.lte('data_fim', filters.data_fim)
  }
  if (filters.valor_min) {
    query = query.gte('valor_aluguel', filters.valor_min)
  }
  if (filters.valor_max) {
    query = query.lte('valor_aluguel', filters.valor_max)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Erro ao buscar contratos: ${error.message}`)
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

// Hook para usar contratos com cache
export function useContratos(params: ContratosListParams = {}) {
  return useQuery<ContratoAluguel[], Error>({
    queryKey: ['contratos', params],
    queryFn: () => fetchContratos(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2
  })
}

// Buscar contrato por ID
export async function getContratoById(id: string): Promise<ContratoAluguel> {
  const { data, error } = await supabase
    .from('contratos_aluguel')
    .select(`
      *,
      imovel:imoveis(*),
      inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
      proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*),
      pagamentos:pagamentos_aluguel(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar contrato: ${error.message}`)
  }

  if (!data) {
    throw new Error('Contrato não encontrado')
  }

  return data
}

// Criar novo contrato
export async function createContrato(contratoData: CreateContratoData): Promise<ContratoAluguel> {
  const { data, error } = await supabase
    .from('contratos_aluguel')
    .insert([contratoData])
    .select(`
      *,
      imovel:imoveis(*),
      inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
      proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao criar contrato: ${error.message}`)
  }

  return data
}

// Atualizar contrato
export async function updateContrato(id: string, contratoData: Partial<CreateContratoData>): Promise<ContratoAluguel> {
  const { data, error } = await supabase
    .from('contratos_aluguel')
    .update(contratoData)
    .eq('id', id)
    .select(`
      *,
      imovel:imoveis(*),
      inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
      proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar contrato: ${error.message}`)
  }

  if (!data) {
    throw new Error('Contrato não encontrado')
  }

  return data
}

// Encerrar contrato (soft delete - muda status para encerrado)
export async function encerrarContrato(id: string): Promise<ContratoAluguel> {
  const { data, error } = await supabase
    .from('contratos_aluguel')
    .update({ status: 'encerrado' })
    .eq('id', id)
    .select(`
      *,
      imovel:imoveis(*),
      inquilino:clientes!contratos_aluguel_inquilino_id_fkey(*),
      proprietario:clientes!contratos_aluguel_proprietario_id_fkey(*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao encerrar contrato: ${error.message}`)
  }

  if (!data) {
    throw new Error('Contrato não encontrado')
  }

  return data
}

// Verificar se imóvel está disponível para aluguel
export async function checkImovelDisponivel(imovelId: string, excludeContratoId?: string): Promise<boolean> {
  let query = supabase
    .from('contratos_aluguel')
    .select('id')
    .eq('imovel_id', imovelId)
    .eq('status', 'ativo')

  if (excludeContratoId) {
    query = query.neq('id', excludeContratoId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao verificar disponibilidade do imóvel: ${error.message}`)
  }

  return (data?.length || 0) === 0
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

// Verificar se cliente existe
export async function checkClienteExists(clienteId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', clienteId)
    .single()

  if (error) {
    return false
  }

  return !!data
}