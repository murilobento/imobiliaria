import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { Cliente, CreateClienteData, UpdateClienteData } from '../../types/cliente'

export interface ClientesListParams {
  page?: number
  limit?: number
  search?: string
  orderBy?: 'nome' | 'email' | 'created_at'
  orderDirection?: 'asc' | 'desc'
}

export interface ClientesListResponse {
  data: Cliente[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Função para buscar todos os clientes (sem cache)
export async function fetchClientes(params: ClientesListParams = {}): Promise<Cliente[]> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'nome',
    orderDirection = 'asc'
  } = params

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%`)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Erro ao buscar clientes: ${error.message}`)
  }

  return data || []
}

// Função para buscar clientes com resposta de API formatada
export async function getClientesList(params: ClientesListParams = {}): Promise<ClientesListResponse> {
  const {
    page = 1,
    limit = 10,
    search = '',
    orderBy = 'nome',
    orderDirection = 'asc'
  } = params

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })

  // Aplicar busca se fornecida
  if (search) {
    query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%`)
  }

  // Aplicar ordenação
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Aplicar paginação
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Erro ao buscar clientes: ${error.message}`)
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

// Hook para usar clientes com cache
export function useClientes(params: ClientesListParams = {}) {
  return useQuery<Cliente[], Error>({
    queryKey: ['clientes', params],
    queryFn: () => fetchClientes(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2
  })
}

// Buscar cliente por ID
export async function getClienteById(id: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar cliente: ${error.message}`)
  }

  if (!data) {
    throw new Error('Cliente não encontrado')
  }

  return data
}

// Criar novo cliente
export async function createCliente(clienteData: CreateClienteData): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert([clienteData])
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar cliente: ${error.message}`)
  }

  return data
}

// Atualizar cliente
export async function updateCliente(id: string, clienteData: Partial<CreateClienteData>): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update(clienteData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar cliente: ${error.message}`)
  }

  if (!data) {
    throw new Error('Cliente não encontrado')
  }

  return data
}

// Excluir cliente
export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao excluir cliente: ${error.message}`)
  }
}

// Verificar se email já existe (para validação de unicidade)
export async function checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
  if (!email) return false

  let query = supabase
    .from('clientes')
    .select('id')
    .eq('email', email)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao verificar email: ${error.message}`)
  }

  return (data?.length || 0) > 0
}