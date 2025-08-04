/**
 * Integration tests for financial security middleware
 * Tests role-based access control, audit logging, and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateFinancialSecurity, logFinancialAudit, validateDataOwnership } from '@/lib/auth/financialSecurityMiddleware';
import { createClient } from '@/lib/supabase-server';
import { logSecurityEvent } from '@/lib/auth/securityLogger';

// Mock dependencies
vi.mock('@/lib/auth/supabase-auth-utils');
vi.mock('@/lib/supabase-server');
vi.mock('@/lib/auth/securityLogger');
vi.mock('@/lib/auth/rateLimitMiddleware');

describe('Financial Security Middleware', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(),
      auth: {
        getUser: vi.fn()
      }
    };

    (createClient as any).mockReturnValue(mockSupabase);

    // Mock request
    mockRequest = new NextRequest('http://localhost:3000/api/contratos', {
      method: 'GET',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser'
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFinancialSecurity', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock authentication failure
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
      (authenticateSupabaseUser as any).mockResolvedValue({
        success: false,
        user: null
      });

      const result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'test_operation'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(401);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          details: expect.objectContaining({
            reason: 'authentication_failed'
          })
        })
      );
    });

    it('should reject requests with insufficient permissions', async () => {
      // Mock successful authentication but insufficient permissions
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
      (authenticateSupabaseUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'real-estate-agent'
        }
      });

      // Mock rate limiting success
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      (rateLimitMiddleware as any).mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });

      const result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.settings.edit', // Admin only permission
        operation: 'test_operation'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(403);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          details: expect.objectContaining({
            reason: 'insufficient_permissions'
          })
        })
      );
    });

    it('should allow requests with proper authentication and permissions', async () => {
      // Mock successful authentication with admin role
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
      (authenticateSupabaseUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: 'admin'
        }
      });

      // Mock rate limiting success
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      (rateLimitMiddleware as any).mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });

      const result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'test_operation'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.auditData).toBeDefined();
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_success'
        })
      );
    });

    it('should validate data integrity for sensitive operations', async () => {
      // Mock successful authentication
      const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
      (authenticateSupabaseUser as any).mockResolvedValue({
        success: true,
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: 'admin'
        }
      });

      // Mock rate limiting success
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      (rateLimitMiddleware as any).mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });

      // Create request with invalid financial data
      const invalidRequest = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser'
        },
        body: JSON.stringify({
          valor_aluguel: -100, // Invalid negative value
          data_inicio: '2024-01-01',
          data_fim: '2023-12-31' // Invalid date range
        })
      });

      const result = await validateFinancialSecurity(invalidRequest, {
        requiredPermission: 'financial.contracts.create',
        operation: 'test_operation',
        sensitiveData: true
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(400);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          details: expect.objectContaining({
            reason: 'data_integrity_violation'
          })
        })
      );
    });

    it('should handle rate limiting violations', async () => {
      // Mock rate limiting failure
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      (rateLimitMiddleware as any).mockResolvedValue({
        success: false,
        response: new Response('Rate limited', { status: 429 }),
        ipLimit: { allowed: false, type: 'ip' }
      });

      const result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'test_operation'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(429);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failure',
          details: expect.objectContaining({
            reason: 'rate_limited'
          })
        })
      );
    });
  });

  describe('logFinancialAudit', () => {
    it('should create audit log entries for financial operations', async () => {
      mockSupabase.insert.mockResolvedValue({ error: null });

      const auditData = {
        userId: 'user-123',
        userRole: 'admin',
        operation: 'create_contrato',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      const details = {
        entityType: 'contrato',
        entityId: 'contrato-456',
        newValues: {
          valor_aluguel: 1500,
          data_inicio: '2024-01-01'
        }
      };

      await logFinancialAudit('create_contrato', 'create', auditData, details);

      expect(mockSupabase.from).toHaveBeenCalledWith('logs_auditoria');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          operacao: 'create_contrato_create',
          tipo: 'operacao_financeira',
          detalhes: expect.objectContaining({
            entity_type: 'contrato',
            entity_id: 'contrato-456',
            user_role: 'admin',
            ip_address: '192.168.1.1',
            operation_type: 'create'
          }),
          resultado: 'sucesso',
          user_id: 'user-123'
        })
      ]);
    });

    it('should handle audit logging errors gracefully', async () => {
      mockSupabase.insert.mockResolvedValue({ 
        error: { message: 'Database error' } 
      });

      const auditData = {
        userId: 'user-123',
        userRole: 'admin',
        operation: 'create_contrato',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      const details = {
        entityType: 'contrato',
        entityId: 'contrato-456'
      };

      // Should not throw error
      await expect(
        logFinancialAudit('create_contrato', 'create', auditData, details)
      ).resolves.not.toThrow();
    });
  });

  describe('validateDataOwnership', () => {
    it('should validate user owns the data they are accessing', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { user_id: 'user-123' },
        error: null
      });

      const result = await validateDataOwnership('user-123', 'contrato', 'contrato-456');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('contratos_aluguel');
      expect(mockSupabase.select).toHaveBeenCalledWith('user_id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'contrato-456');
    });

    it('should reject access to data owned by other users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { user_id: 'other-user-456' },
        error: null
      });

      const result = await validateDataOwnership('user-123', 'contrato', 'contrato-456');

      expect(result).toBe(false);
    });

    it('should handle non-existent data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const result = await validateDataOwnership('user-123', 'contrato', 'contrato-456');

      expect(result).toBe(false);
    });

    it('should validate different entity types', async () => {
      const entityTypes = [
        { type: 'contrato', table: 'contratos_aluguel' },
        { type: 'pagamento', table: 'pagamentos_aluguel' },
        { type: 'despesa', table: 'despesas_imoveis' },
        { type: 'configuracao', table: 'configuracoes_financeiras' }
      ];

      for (const { type, table } of entityTypes) {
        vi.clearAllMocks();
        mockSupabase.single.mockResolvedValue({
          data: { user_id: 'user-123' },
          error: null
        });

        await validateDataOwnership('user-123', type as any, 'entity-456');

        expect(mockSupabase.from).toHaveBeenCalledWith(table);
      }
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate financial values within acceptable ranges', async () => {
      const testCases = [
        { valor_aluguel: 0, shouldFail: true },
        { valor_aluguel: -100, shouldFail: true },
        { valor_aluguel: 1000000, shouldFail: true },
        { valor_aluguel: 1500, shouldFail: false },
        { valor_pago: -50, shouldFail: true },
        { valor_devido: 0, shouldFail: true }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(testCase)
        });

        // Mock successful auth and rate limiting
        const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
        (authenticateSupabaseUser as any).mockResolvedValue({
          success: true,
          user: { id: 'admin-123', role: 'admin' }
        });

        const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
        (rateLimitMiddleware as any).mockResolvedValue({
          success: true,
          ipLimit: { allowed: true, type: 'ip' }
        });

        const result = await validateFinancialSecurity(request, {
          requiredPermission: 'financial.contracts.create',
          operation: 'test_operation',
          sensitiveData: true
        });

        if (testCase.shouldFail) {
          expect(result.success).toBe(false);
          expect(result.response?.status).toBe(400);
        } else {
          expect(result.success).toBe(true);
        }
      }
    });

    it('should validate date ranges', async () => {
      const testCases = [
        {
          data_inicio: '2024-01-01',
          data_fim: '2023-12-31',
          shouldFail: true // End before start
        },
        {
          data_inicio: '2024-01-01',
          data_fim: '2034-01-01',
          shouldFail: true // More than 10 years
        },
        {
          data_inicio: '2024-01-01',
          data_fim: '2025-01-01',
          shouldFail: false // Valid range
        }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(testCase)
        });

        // Mock successful auth and rate limiting
        const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
        (authenticateSupabaseUser as any).mockResolvedValue({
          success: true,
          user: { id: 'admin-123', role: 'admin' }
        });

        const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
        (rateLimitMiddleware as any).mockResolvedValue({
          success: true,
          ipLimit: { allowed: true, type: 'ip' }
        });

        const result = await validateFinancialSecurity(request, {
          requiredPermission: 'financial.contracts.create',
          operation: 'test_operation',
          sensitiveData: true
        });

        if (testCase.shouldFail) {
          expect(result.success).toBe(false);
          expect(result.response?.status).toBe(400);
        } else {
          expect(result.success).toBe(true);
        }
      }
    });

    it('should validate percentage values', async () => {
      const testCases = [
        { taxa_juros_mensal: -0.01, shouldFail: true },
        { taxa_juros_mensal: 0.15, shouldFail: true }, // More than 10%
        { taxa_juros_mensal: 0.01, shouldFail: false },
        { taxa_multa: -0.01, shouldFail: true },
        { taxa_multa: 0.25, shouldFail: true }, // More than 20%
        { taxa_multa: 0.02, shouldFail: false }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(testCase)
        });

        // Mock successful auth and rate limiting
        const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
        (authenticateSupabaseUser as any).mockResolvedValue({
          success: true,
          user: { id: 'admin-123', role: 'admin' }
        });

        const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
        (rateLimitMiddleware as any).mockResolvedValue({
          success: true,
          ipLimit: { allowed: true, type: 'ip' }
        });

        const result = await validateFinancialSecurity(request, {
          requiredPermission: 'financial.settings.edit',
          operation: 'test_operation',
          sensitiveData: true
        });

        if (testCase.shouldFail) {
          expect(result.success).toBe(false);
          expect(result.response?.status).toBe(400);
        } else {
          expect(result.success).toBe(true);
        }
      }
    });

    it('should validate UUID formats', async () => {
      const testCases = [
        { imovel_id: 'invalid-uuid', shouldFail: true },
        { imovel_id: '123e4567-e89b-12d3-a456-426614174000', shouldFail: false },
        { inquilino_id: 'not-a-uuid', shouldFail: true },
        { contrato_id: '550e8400-e29b-41d4-a716-446655440000', shouldFail: false }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(testCase)
        });

        // Mock successful auth and rate limiting
        const { authenticateSupabaseUser } = await import('@/lib/auth/supabase-auth-utils');
        (authenticateSupabaseUser as any).mockResolvedValue({
          success: true,
          user: { id: 'admin-123', role: 'admin' }
        });

        const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
        (rateLimitMiddleware as any).mockResolvedValue({
          success: true,
          ipLimit: { allowed: true, type: 'ip' }
        });

        const result = await validateFinancialSecurity(request, {
          requiredPermission: 'financial.contracts.create',
          operation: 'test_operation',
          sensitiveData: true
        });

        if (testCase.shouldFail) {
          expect(result.success).toBe(false);
          expect(result.response?.status).toBe(400);
        } else {
          expect(result.success).toBe(true);
        }
      }
    });
  });
});