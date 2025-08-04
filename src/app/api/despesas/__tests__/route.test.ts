import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock the dependencies
vi.mock('../../../../lib/supabase-server', () => {
  const createMockQuery = (data: any = [], error: any = null, count: number = 0) => {
    const mockQuery = {
      select: vi.fn(() => mockQuery),
      or: vi.fn(() => mockQuery),
      eq: vi.fn(() => mockQuery),
      gte: vi.fn(() => mockQuery),
      lte: vi.fn(() => mockQuery),
      order: vi.fn(() => mockQuery),
      range: vi.fn(() => Promise.resolve({ data, error, count })),
      insert: vi.fn(() => mockQuery),
      single: vi.fn(() => Promise.resolve({ data, error }))
    }
    return mockQuery
  }

  return {
    createServerSupabaseClient: vi.fn(() => Promise.resolve({
      from: vi.fn(() => createMockQuery())
    }))
  }
})

vi.mock('../../../../lib/utils/validation', () => ({
  validateDespesa: vi.fn(),
  sanitizeInput: vi.fn(),
  validateRelationships: vi.fn(),
  formatValidationErrors: vi.fn(),
}))

vi.mock('../../../../lib/api/despesas', () => ({
  checkImovelExists: vi.fn(),
}))

describe('/api/despesas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/despesas', () => {
    it('should return despesas list successfully', async () => {
      const { createServerSupabaseClient } = await import('../../../../lib/supabase-server')
      
      const mockDespesas = [
        {
          id: '1',
          imovel_id: 'imovel-1',
          categoria: 'manutencao',
          descricao: 'Reparo no telhado',
          valor: 500,
          data_despesa: '2024-01-15',
          status: 'pago',
          imovel: { id: 'imovel-1', titulo: 'Casa 1' }
        }
      ]

      // Mock the query to return success data
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        or: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        range: vi.fn(() => Promise.resolve({ 
          data: mockDespesas, 
          error: null, 
          count: 1 
        }))
      }

      const mockSupabase = {
        from: vi.fn(() => mockQuery)
      }

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

      const request = new NextRequest('http://localhost:3000/api/despesas')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockDespesas)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      })
    })

    it('should handle query parameters correctly', async () => {
      const { createServerSupabaseClient } = await import('../../../../lib/supabase-server')
      
      // Mock the query to return empty data
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        or: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        range: vi.fn(() => Promise.resolve({ 
          data: [], 
          error: null, 
          count: 0 
        }))
      }

      const mockSupabase = {
        from: vi.fn(() => mockQuery)
      }

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

      const url = 'http://localhost:3000/api/despesas?page=2&limit=5&search=reparo&categoria=manutencao&status=pago&orderBy=valor&orderDirection=asc'
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('despesas_imoveis')
    })

    it('should handle database errors gracefully', async () => {
      const { createServerSupabaseClient } = await import('../../../../lib/supabase-server')
      
      // Mock the query to return error
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        or: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        range: vi.fn(() => Promise.resolve({ 
          data: null, 
          error: { message: 'Database error' }, 
          count: 0 
        }))
      }

      const mockSupabase = {
        from: vi.fn(() => mockQuery)
      }

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

      const request = new NextRequest('http://localhost:3000/api/despesas')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Erro interno do servidor' })
    })
  })

  describe('POST /api/despesas', () => {
    it('should create despesa successfully', async () => {
      const { validateDespesa, sanitizeInput, validateRelationships } = await import('../../../../lib/utils/validation')
      const { checkImovelExists } = await import('../../../../lib/api/despesas')
      const { createServerSupabaseClient } = await import('../../../../lib/supabase-server')

      // Mock validation
      vi.mocked(sanitizeInput).mockReturnValue({
        imovel_id: 'imovel-1',
        categoria: 'manutencao',
        descricao: 'Reparo no telhado',
        valor: '500',
        data_despesa: '2024-01-15',
        status: 'pendente'
      })

      vi.mocked(validateDespesa).mockReturnValue({
        isValid: true,
        errors: []
      })

      vi.mocked(validateRelationships).mockResolvedValue([])
      vi.mocked(checkImovelExists).mockResolvedValue(true)

      // Mock database insertion
      const mockDespesa = {
        id: 'despesa-1',
        imovel_id: 'imovel-1',
        categoria: 'manutencao',
        descricao: 'Reparo no telhado',
        valor: 500,
        data_despesa: '2024-01-15',
        status: 'pendente',
        imovel: { id: 'imovel-1', titulo: 'Casa 1' }
      }

      const mockQuery = {
        insert: vi.fn(() => mockQuery),
        select: vi.fn(() => mockQuery),
        single: vi.fn(() => Promise.resolve({ data: mockDespesa, error: null }))
      }

      const mockSupabase = {
        from: vi.fn(() => mockQuery)
      }

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

      const requestBody = {
        imovel_id: 'imovel-1',
        categoria: 'manutencao',
        descricao: 'Reparo no telhado',
        valor: '500',
        data_despesa: '2024-01-15',
        status: 'pendente'
      }

      const request = new NextRequest('http://localhost:3000/api/despesas', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockDespesa)
    })

    it('should return 400 for validation errors', async () => {
      const { validateDespesa, sanitizeInput, formatValidationErrors } = await import('../../../../lib/utils/validation')
      const { createServerSupabaseClient } = await import('../../../../lib/supabase-server')

      vi.mocked(sanitizeInput).mockReturnValue({})
      vi.mocked(validateDespesa).mockReturnValue({
        isValid: false,
        errors: [{ field: 'imovel_id', message: 'Campo obrigatório', code: 'REQUIRED' }]
      })
      vi.mocked(formatValidationErrors).mockReturnValue({
        imovel_id: ['Campo obrigatório']
      })

      // Mock supabase client (won't be used due to validation error)
      const mockSupabase = { from: vi.fn() }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

      const request = new NextRequest('http://localhost:3000/api/despesas', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dados inválidos')
      expect(data.details).toEqual({ imovel_id: ['Campo obrigatório'] })
    })

    it('should return 400 for invalid relationships', async () => {
      const { validateDespesa, sanitizeInput, validateRelationships, formatValidationErrors } = await import('../../../../lib/utils/validation')
      const { checkImovelExists } = await import('../../../../lib/api/despesas')

      vi.mocked(sanitizeInput).mockReturnValue({ imovel_id: 'nonexistent' })
      vi.mocked(validateDespesa).mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(validateRelationships).mockResolvedValue([
        { field: 'imovel_id', message: 'Imóvel não encontrado', code: 'INVALID_RELATIONSHIP' }
      ])
      vi.mocked(formatValidationErrors).mockReturnValue({
        imovel_id: ['Imóvel não encontrado']
      })

      const request = new NextRequest('http://localhost:3000/api/despesas', {
        method: 'POST',
        body: JSON.stringify({ imovel_id: 'nonexistent' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dados inválidos')
      expect(data.details).toEqual({ imovel_id: ['Imóvel não encontrado'] })
    })

    it('should handle database errors', async () => {
      const { validateDespesa, sanitizeInput, validateRelationships } = await import('../../../../lib/utils/validation')
      const { createServerSupabaseClient } = await import('../../../../lib/supabase-server')

      vi.mocked(sanitizeInput).mockReturnValue({
        imovel_id: 'imovel-1',
        categoria: 'manutencao',
        descricao: 'Test',
        valor: '100',
        data_despesa: '2024-01-01'
      })
      vi.mocked(validateDespesa).mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(validateRelationships).mockResolvedValue([])

      const mockQuery = {
        insert: vi.fn(() => mockQuery),
        select: vi.fn(() => mockQuery),
        single: vi.fn(() => Promise.resolve({ 
          data: null, 
          error: { message: 'Database error' } 
        }))
      }

      const mockSupabase = {
        from: vi.fn(() => mockQuery)
      }

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

      const request = new NextRequest('http://localhost:3000/api/despesas', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro ao criar despesa')
    })
  })
})