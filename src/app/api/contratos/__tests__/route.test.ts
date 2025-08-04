import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock the dependencies
vi.mock('../../../../lib/api/contratos', () => ({
  getContratosList: vi.fn(),
  createContrato: vi.fn(),
  checkImovelDisponivel: vi.fn(),
  checkImovelExists: vi.fn(),
  checkClienteExists: vi.fn(),
}))

vi.mock('../../../../lib/utils/validation', () => ({
  validateContrato: vi.fn(),
  sanitizeInput: vi.fn(),
  formatValidationErrors: vi.fn(),
}))

vi.mock('@/lib/auth/supabase-auth-utils', () => ({
  authenticateSupabaseUser: vi.fn(),
}))

describe('/api/contratos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/contratos', () => {
    it('should return contracts list successfully', async () => {
      const { getContratosList } = await import('../../../../lib/api/contratos')
      
      const mockContratos = {
        data: [
          {
            id: '1',
            imovel_id: 'imovel-1',
            inquilino_id: 'cliente-1',
            valor_aluguel: 1000,
            status: 'ativo',
            data_inicio: '2024-01-01',
            data_fim: '2024-12-31',
            dia_vencimento: 10,
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      }

      vi.mocked(getContratosList).mockResolvedValue(mockContratos)

      const request = new NextRequest('http://localhost:3000/api/contratos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockContratos)
      expect(getContratosList).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: '',
        orderBy: 'created_at',
        orderDirection: 'desc',
        filters: {}
      })
    })

    it('should handle query parameters correctly', async () => {
      const { getContratosList } = await import('../../../../lib/api/contratos')
      
      vi.mocked(getContratosList).mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0
      })

      const url = 'http://localhost:3000/api/contratos?page=2&limit=5&search=test&status=ativo&orderBy=valor_aluguel&orderDirection=asc'
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getContratosList).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'test',
        orderBy: 'valor_aluguel',
        orderDirection: 'asc',
        filters: {
          status: 'ativo'
        }
      })
    })

    it('should handle errors gracefully', async () => {
      const { getContratosList } = await import('../../../../lib/api/contratos')
      
      vi.mocked(getContratosList).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/contratos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Erro interno do servidor' })
    })
  })

  describe('POST /api/contratos', () => {
    it('should create contract successfully', async () => {
      const { createContrato, checkImovelExists, checkImovelDisponivel, checkClienteExists } = await import('../../../../lib/api/contratos')
      const { validateContrato, sanitizeInput } = await import('../../../../lib/utils/validation')
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils')

      // Mock authentication
      vi.mocked(authenticateSupabaseUser).mockResolvedValue({
        success: true,
        user: { id: 'user-1', role: 'admin' }
      } as any)

      // Mock validation
      vi.mocked(sanitizeInput).mockReturnValue({
        imovel_id: 'imovel-1',
        inquilino_id: 'cliente-1',
        valor_aluguel: '1000',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: '10'
      })

      vi.mocked(validateContrato).mockReturnValue({
        isValid: true,
        errors: []
      })

      // Mock existence checks
      vi.mocked(checkImovelExists).mockResolvedValue(true)
      vi.mocked(checkImovelDisponivel).mockResolvedValue(true)
      vi.mocked(checkClienteExists).mockResolvedValue(true)

      // Mock contract creation
      const mockContrato = {
        id: 'contrato-1',
        imovel_id: 'imovel-1',
        inquilino_id: 'cliente-1',
        valor_aluguel: 1000,
        status: 'ativo',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: 10,
      }
      vi.mocked(createContrato).mockResolvedValue(mockContrato as any)

      const requestBody = {
        imovel_id: 'imovel-1',
        inquilino_id: 'cliente-1',
        valor_aluguel: '1000',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: '10'
      }

      const request = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockContrato)
      expect(data.message).toBe('Contrato criado com sucesso')
    })

    it('should return 401 for unauthenticated requests', async () => {
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils')

      vi.mocked(authenticateSupabaseUser).mockResolvedValue({
        success: false,
        error: 'Unauthorized'
      } as any)

      const request = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Não autorizado')
    })

    it('should return 403 for users without permission', async () => {
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils')

      vi.mocked(authenticateSupabaseUser).mockResolvedValue({
        success: true,
        user: { id: 'user-1', role: 'user' }
      } as any)

      const request = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Permissão negada')
    })

    it('should return 400 for validation errors', async () => {
      const { validateContrato, sanitizeInput, formatValidationErrors } = await import('../../../../lib/utils/validation')
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils')

      vi.mocked(authenticateSupabaseUser).mockResolvedValue({
        success: true,
        user: { id: 'user-1', role: 'admin' }
      } as any)

      vi.mocked(sanitizeInput).mockReturnValue({})
      vi.mocked(validateContrato).mockReturnValue({
        isValid: false,
        errors: [{ field: 'imovel_id', message: 'Campo obrigatório', code: 'REQUIRED' }]
      })
      vi.mocked(formatValidationErrors).mockReturnValue({
        imovel_id: ['Campo obrigatório']
      })

      const request = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dados inválidos')
      expect(data.errors).toEqual({ imovel_id: ['Campo obrigatório'] })
    })

    it('should return 404 when property does not exist', async () => {
      const { checkImovelExists } = await import('../../../../lib/api/contratos')
      const { validateContrato, sanitizeInput } = await import('../../../../lib/utils/validation')
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils')

      vi.mocked(authenticateSupabaseUser).mockResolvedValue({
        success: true,
        user: { id: 'user-1', role: 'admin' }
      } as any)

      vi.mocked(sanitizeInput).mockReturnValue({ imovel_id: 'nonexistent' })
      vi.mocked(validateContrato).mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(checkImovelExists).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify({ imovel_id: 'nonexistent' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Imóvel não encontrado')
    })

    it('should return 409 when property is not available', async () => {
      const { checkImovelExists, checkImovelDisponivel } = await import('../../../../lib/api/contratos')
      const { validateContrato, sanitizeInput } = await import('../../../../lib/utils/validation')
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils')

      vi.mocked(authenticateSupabaseUser).mockResolvedValue({
        success: true,
        user: { id: 'user-1', role: 'admin' }
      } as any)

      vi.mocked(sanitizeInput).mockReturnValue({ imovel_id: 'occupied' })
      vi.mocked(validateContrato).mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(checkImovelExists).mockResolvedValue(true)
      vi.mocked(checkImovelDisponivel).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        body: JSON.stringify({ imovel_id: 'occupied' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Imóvel não disponível')
    })
  })
})