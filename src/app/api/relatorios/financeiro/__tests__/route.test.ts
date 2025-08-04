import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock das dependências
vi.mock('@/lib/auth/supabase-auth-utils', () => ({
  authenticateSupabaseUser: vi.fn()
}))

vi.mock('@/lib/supabase-server', () => ({
  supabase: {
    from: vi.fn()
  }
}))

const mockAuthenticateSupabaseUser = vi.mocked(await import('@/lib/auth/supabase-auth-utils')).authenticateSupabaseUser
const mockSupabase = vi.mocked(await import('@/lib/supabase-server')).supabase

describe('/api/relatorios/financeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('deve retornar erro 401 se usuário não autenticado', async () => {
      mockAuthenticateSupabaseUser.mockResolvedValue({
        success: false,
        user: null
      })

      const request = new NextRequest('http://localhost:3000/api/relatorios/financeiro')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Não autorizado')
    })

    it('deve retornar erro 403 se usuário não tem permissão', async () => {
      mockAuthenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { id: '1', role: 'user' }
      })

      const request = new NextRequest('http://localhost:3000/api/relatorios/financeiro')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Permissão negada')
    })

    it('deve retornar erro 400 para datas inválidas', async () => {
      mockAuthenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { id: '1', role: 'admin' }
      })

      const request = new NextRequest('http://localhost:3000/api/relatorios/financeiro?data_inicio=2024-12-01&data_fim=2024-11-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datas inválidas')
    })

    it('deve gerar relatório financeiro com sucesso', async () => {
      mockAuthenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { id: '1', role: 'admin' }
      })

      // Mock dos dados de pagamentos
      const mockPagamentos = [
        {
          id: '1',
          contrato_id: 'c1',
          valor_devido: 1000,
          valor_pago: 1000,
          valor_juros: 0,
          valor_multa: 0,
          status: 'pago',
          data_vencimento: '2024-01-10',
          data_pagamento: '2024-01-10',
          contrato: {
            id: 'c1',
            valor_aluguel: 1000,
            imovel: { id: 'i1', endereco: 'Rua A', cidade: 'São Paulo' }
          }
        },
        {
          id: '2',
          contrato_id: 'c2',
          valor_devido: 1500,
          valor_pago: 0,
          valor_juros: 15,
          valor_multa: 30,
          status: 'atrasado',
          data_vencimento: '2024-01-10',
          data_pagamento: null,
          contrato: {
            id: 'c2',
            valor_aluguel: 1500,
            imovel: { id: 'i2', endereco: 'Rua B', cidade: 'São Paulo' }
          }
        }
      ]

      // Mock dos dados de despesas
      const mockDespesas = [
        {
          id: '1',
          imovel_id: 'i1',
          categoria: 'manutencao',
          valor: 200,
          status: 'pago',
          data_despesa: '2024-01-15',
          imovel: { id: 'i1', endereco: 'Rua A', cidade: 'São Paulo' }
        },
        {
          id: '2',
          imovel_id: 'i2',
          categoria: 'impostos',
          valor: 300,
          status: 'pago',
          data_despesa: '2024-01-20',
          imovel: { id: 'i2', endereco: 'Rua B', cidade: 'São Paulo' }
        }
      ]

      // Mock dos contratos
      const mockContratos = [
        { id: 'c1', valor_aluguel: 1000 },
        { id: 'c2', valor_aluguel: 1500 }
      ]

      // Configurar mocks do Supabase
      const mockFrom = vi.fn()
      const mockSelect = vi.fn()
      const mockGte = vi.fn()
      const mockLte = vi.fn()
      const mockEq = vi.fn()
      const mockOrder = vi.fn()

      mockSupabase.from.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ gte: mockGte })
      mockGte.mockReturnValue({ lte: mockLte })
      mockLte.mockReturnValue({ order: mockOrder })
      mockEq.mockReturnValue({ data: mockContratos, error: null })
      mockOrder.mockReturnValue({ data: mockPagamentos, error: null })

      // Configurar diferentes retornos para diferentes tabelas
      mockSupabase.from
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({ data: mockPagamentos, error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({ data: mockDespesas, error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: mockContratos, error: null })
          })
        })

      const request = new NextRequest('http://localhost:3000/api/relatorios/financeiro?data_inicio=2024-01-01&data_fim=2024-01-31')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('periodo')
      expect(data.data).toHaveProperty('receitas')
      expect(data.data).toHaveProperty('despesas')
      expect(data.data).toHaveProperty('inadimplencia')
      expect(data.data).toHaveProperty('rentabilidade')
      
      // Verificar cálculos
      expect(data.data.receitas.total).toBe(1000) // Apenas pagamentos pagos
      expect(data.data.despesas.total).toBe(500) // 200 + 300
      expect(data.data.rentabilidade.liquida).toBe(500) // 1000 - 500
    })

    it('deve retornar dados para exportação quando formato especificado', async () => {
      mockAuthenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { id: '1', role: 'admin' }
      })

      // Configurar mocks para todas as três consultas
      mockSupabase.from
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({ data: [], error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({ data: [], error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null })
          })
        })

      const request = new NextRequest('http://localhost:3000/api/relatorios/financeiro?formato=pdf')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.formato).toBe('pdf')
      expect(data).toHaveProperty('detalhes')
    })

    it('deve tratar erro do banco de dados', async () => {
      mockAuthenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { id: '1', role: 'admin' }
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ data: null, error: { message: 'Database error' } })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/relatorios/financeiro')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro ao buscar dados de pagamentos')
    })
  })
})