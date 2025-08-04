import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';
import { createClient } from '@/lib/supabase-server';

// Mock do Supabase
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn()
}));

// Mock do NextRequest
const createMockRequest = (method: string, body?: any) => {
  const request = {
    method,
    json: vi.fn().mockResolvedValue(body),
    url: 'http://localhost:3000/api/configuracoes-financeiras'
  } as unknown as NextRequest;
  
  return request;
};

describe('/api/configuracoes-financeiras', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn()
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/configuracoes-financeiras', () => {
    it('deve retornar erro 401 se usuário não estiver autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Não autorizado')
      });

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve retornar configuração existente', async () => {
      const mockUser = { id: 'user-123' };
      const mockConfiguracao = {
        id: 'config-123',
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5,
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock para a consulta que retorna array
      mockSupabase.limit.mockResolvedValue({
        data: [mockConfiguracao],
        error: null
      });

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockConfiguracao);
      expect(mockSupabase.from).toHaveBeenCalledWith('configuracoes_financeiras');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('deve criar configuração padrão se não existir', async () => {
      const mockUser = { id: 'user-123' };
      const mockNovaConfiguracao = {
        id: 'config-123',
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5,
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Primeira consulta retorna vazio
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Segunda consulta (insert) retorna nova configuração
      mockSupabase.single.mockResolvedValueOnce({
        data: mockNovaConfiguracao,
        error: null
      });

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNovaConfiguracao);
      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5,
        user_id: 'user-123'
      }]);
    });

    it('deve retornar erro 500 em caso de erro no banco', async () => {
      const mockUser = { id: 'user-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: new Error('Erro no banco')
      });

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });

  describe('PUT /api/configuracoes-financeiras', () => {
    it('deve retornar erro 401 se usuário não estiver autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Não autorizado')
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      const mockUser = { id: 'user-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: -0.01, // Valor inválido
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
      expect(data.details).toBeDefined();
    });

    it('deve atualizar configuração existente', async () => {
      const mockUser = { id: 'user-123' };
      const mockConfiguracaoExistente = [{ id: 'config-123' }];
      const mockConfiguracaoAtualizada = {
        id: 'config-123',
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7,
        user_id: 'user-123',
        updated_at: '2024-01-02T00:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Buscar configuração existente
      mockSupabase.limit.mockResolvedValueOnce({
        data: mockConfiguracaoExistente,
        error: null
      });

      // Atualizar configuração
      mockSupabase.single.mockResolvedValueOnce({
        data: mockConfiguracaoAtualizada,
        error: null
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockConfiguracaoAtualizada);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7,
        updated_at: expect.any(String)
      });
    });

    it('deve criar nova configuração se não existir', async () => {
      const mockUser = { id: 'user-123' };
      const mockNovaConfiguracao = {
        id: 'config-123',
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7,
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Buscar configuração existente (não encontra)
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Criar nova configuração
      mockSupabase.single.mockResolvedValueOnce({
        data: mockNovaConfiguracao,
        error: null
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNovaConfiguracao);
      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        taxa_juros_mensal: 0.015,
        taxa_multa: 0.025,
        taxa_comissao: 0.12,
        dias_carencia: 7,
        user_id: 'user-123'
      }]);
    });

    it('deve validar limites das taxas', async () => {
      const mockUser = { id: 'user-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: 1.5, // Acima de 100%
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
    });

    it('deve validar dias de carência', async () => {
      const mockUser = { id: 'user-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 35 // Acima do limite
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
    });

    it('deve retornar erro 500 em caso de erro no banco', async () => {
      const mockUser = { id: 'user-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: new Error('Erro no banco')
      });

      const request = createMockRequest('PUT', {
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });
});