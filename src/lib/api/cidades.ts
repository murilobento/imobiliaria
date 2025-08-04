import { useQuery } from '@tanstack/react-query'
import { Cidade, CreateCidadeData, UpdateCidadeData } from '@/types/cidade'

const API_BASE_URL = '/api/cidades'

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// Função para buscar todas as cidades (sem cache)
export async function fetchCidades(): Promise<Cidade[]> {
  try {
    const response = await fetch(API_BASE_URL)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao buscar cidades')
    }

    return data.cidades
  } catch (error) {
    console.error('Erro ao buscar cidades:', error)
    throw error
  }
}

// Hook para usar cidades com cache
export function useCidades() {
  return useQuery<Cidade[], Error>({
    queryKey: ['cidades'],
    queryFn: fetchCidades,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2
  })
}

// Buscar cidade específica
export async function getCidade(id: string): Promise<ApiResponse<Cidade>> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`)
    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Erro ao buscar cidade' }
    }

    return { data: data.cidade }
  } catch (error) {
    console.error('Erro ao buscar cidade:', error)
    return { error: 'Erro de conexão' }
  }
}

// Criar nova cidade
export async function createCidade(cidadeData: CreateCidadeData): Promise<ApiResponse<Cidade>> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cidadeData),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Erro ao criar cidade' }
    }

    return { data: data.cidade }
  } catch (error) {
    console.error('Erro ao criar cidade:', error)
    return { error: 'Erro de conexão' }
  }
}

// Atualizar cidade
export async function updateCidade(id: string, cidadeData: Partial<UpdateCidadeData>): Promise<ApiResponse<Cidade>> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cidadeData),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Erro ao atualizar cidade' }
    }

    return { data: data.cidade }
  } catch (error) {
    console.error('Erro ao atualizar cidade:', error)
    return { error: 'Erro de conexão' }
  }
}

// Excluir cidade
export async function deleteCidade(id: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Erro ao excluir cidade' }
    }

    return { data: { message: data.message } }
  } catch (error) {
    console.error('Erro ao excluir cidade:', error)
    return { error: 'Erro de conexão' }
  }
}