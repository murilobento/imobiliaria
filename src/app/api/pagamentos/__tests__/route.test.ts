import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import * as pagamentosApi from '../../../../lib/api/pagamentos'
import * as validation from '../../../../lib/utils/validation'
import * as authUtils from '../../../../lib/auth/supabase-auth-utils'

// Mock das dependências
vi.mock('../../../../lib/api/pagamentos')
vi.mock('../../../../lib/utils/validation')
vi.mock('../../../../lib/auth/supabase-auth-utils')

const mockPagamentosApi = vi.mocked(pagamentosApi)
const mockValidation = vi.mocked(validation)
const mockAuthUtils = vi.mocked(authUtils)

describe('/api/pagamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/pagamentos', () => {
    it('deve retornar lista de pagamentos com parâmetros padrão', async () => {
      const mockPagamentos = {
        data: [
          {
            id: '1',
            contrato_id: 'contrato-1',
            mes_referencia: '2024-01-01',
            valor_devido: 1000,
            status: 'pendente',
            data_vencimento: '2024-01-10'
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      }

      mockPagamentosApi.getPagamentosList.mockResolvedValue(mockPagamentos)

      const request = new NextRequest('http://localhost:3000/api/pagamentos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockPagamentos)
      expect(mockPagamentosApi.getPagamentosList).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: '',
        orderBy: 'data_vencimento',
        orderDirection: 'desc',
        filters: {}
      })
    })

    it('deve aplicar filtros corretamente', async () => {
      const mockPagamentos = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      }

      mockPagamentosApi.getPagamentosList.mockResolvedValue(mockPagamentos)

      const url = new URL('http://localhost:3000/api/pagamentos')
      url.searchParams.set('status', 'pago')
      url.searchParams.set('contrato_id', 'contrato-123')
      url.searchParams.set('page', '2')
      url.searchParams.set('limit', '20')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPagamentosApi.getPagamentosList).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        search: '',
        orderBy: 'data_vencimento',
        orderDirection: 'desc',
        filters: {
          status: 'pago',
          contrato_id: 'contrato-123'
        }
      })
    })

    it('deve retornar erro 500 em caso de falha', async () => {
      mockPagamentosApi.getPagamentosList.mockRejectedValue(new Error('Erro no banco'))

      const request = new NextRequest('http://localhost:3000/api/pagamentos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Erro interno do servidor' })
    })
  })

  describe('POST /api/pagamentos', () => {
    const mockUser = {
      id: 'user-123',
      role: 'admin',
      email: 'admin@test.com'
    }

    const validPagamentoData = {
      contrato_id: 'contrato-123',
      mes_referencia: '2024-01-01',
      valor_devido: '1000',
      data_vencimento: '2024-01-10',
      status: 'pendente'
    }

    beforeEach(() => {
      mockAuthUtils.authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: mockUser
      })
      mockValidation.sanitizeInput.mockImplementation((data) => data)
      mockValidation.validatePagamento.mockReturnValue({
        isValid: true,
        errors: []
      })
      mockValidation.formatValidationErrors.mockReturnValue({})
      mockPagamentosApi.checkContratoExists.mockResolvedValue(true)
    })

    it('deve criar pagamento com dados válidos', async () => {
      const mockPagamento = {
        id: 'pagamento-123',
        ...validPagamentoData,
        valor_devido: 1000,
        created_at: '2024-01-01T00:00:00Z'
      }

      mockPagamentosApi.createPagamento.mockResolvedValue(mockPagamento)

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(validPagamentoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPagamento)
      expect(data.message).toBe('Pagamento registrado com sucesso')
    })

    it('deve retornar erro 401 se usuário não autenticado', async () => {
      mockAuthUtils.authenticateSupabaseUser.mockResolvedValue({
        success: false,
        user: null
      })

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(validPagamentoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Não autorizado')
    })

    it('deve retornar erro 403 se usuário sem permissão', async () => {
      mockAuthUtils.authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { ...mockUser, role: 'user' }
      })

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(validPagamentoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Permissão negada')
    })

    it('deve retornar erro 400 com dados inválidos', async () => {
      mockValidation.validatePagamento.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'valor_devido', message: 'Valor deve ser maior que zero', code: 'MIN_VALUE' }
        ]
      })
      mockValidation.formatValidationErrors.mockReturnValue({
        valor_devido: ['Valor deve ser maior que zero']
      })

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify({ ...validPagamentoData, valor_devido: '0' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dados inválidos')
      expect(data.errors).toEqual({
        valor_devido: ['Valor deve ser maior que zero']
      })
    })

    it('deve retornar erro 404 se contrato não existe', async () => {
      mockPagamentosApi.checkContratoExists.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(validPagamentoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Contrato não encontrado')
    })

    it('deve permitir acesso para corretor', async () => {
      mockAuthUtils.authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { ...mockUser, role: 'real-estate-agent' }
      })

      const mockPagamento = {
        id: 'pagamento-123',
        ...validPagamentoData,
        valor_devido: 1000
      }

      mockPagamentosApi.createPagamento.mockResolvedValue(mockPagamento)

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(validPagamentoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('deve retornar erro 500 em caso de falha na criação', async () => {
      mockPagamentosApi.createPagamento.mockRejectedValue(new Error('Erro no banco'))

      const request = new NextRequest('http://localhost:3000/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(validPagamentoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Erro interno do servidor')
    })
  })
})