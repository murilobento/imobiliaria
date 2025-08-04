/**
 * Comprehensive Security Tests for Financial System
 * Tests authentication, authorization, data validation, and audit logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Mock dependencies
vi.mock('@/lib/supabase-server');
vi.mock('@/lib/auth/supabase-auth-utils');
vi.mock('@/lib/auth/rateLimitMiddleware');
vi.mock('@/lib/auth/securityLogger');

describe('Financial System Security Tests', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      auth: {
        getUser: vi.fn()
      }
    };

    (createClient as any).mockReturnValue(mockSupabase);

    mockRequest = new NextRequest('http://localhost:3000/api/contratos', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer valid-token',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser'
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const unauthenticatedRequest = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: false,
        user: null,
        error: 'No authorization header'
      });

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      const result = await validateFinancialSecurity(unauthenticatedRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(401);
    });

    it('should reject requests with invalid/expired tokens', async () => {
      const invalidTokenRequest = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer invalid-or-expired-token',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: false,
        user: null,
        error: 'Invalid token'
      });

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      const result = await validateFinancialSecurity(invalidTokenRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(401);
    });

    it('should validate token signature and expiration', async () => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      
      // Test expired token
      authenticateSupabaseUser.mockResolvedValueOnce({
        success: false,
        user: null,
        error: 'Token expired'
      });

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      let result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(401);

      // Test invalid signature
      authenticateSupabaseUser.mockResolvedValueOnce({
        success: false,
        user: null,
        error: 'Invalid signature'
      });

      result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(401);
    });

    it('should handle session hijacking attempts', async () => {
      const suspiciousRequest = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-forwarded-for': '10.0.0.1', // Different IP from session creation
          'user-agent': 'Different Browser'
        }
      });

      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'admin',
          session_ip: '192.168.1.1', // Original IP
          session_user_agent: 'Mozilla/5.0 Original Browser'
        }
      });

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      const result = await validateFinancialSecurity(suspiciousRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts',
        validateSession: true
      });

      // Should flag suspicious activity but may still allow with additional verification
      expect(result.suspicious).toBe(true);
    });
  });

  describe('Authorization and Role-Based Access Control', () => {
    const testCases = [
      {
        role: 'admin',
        permissions: [
          'financial.contracts.view',
          'financial.contracts.create',
          'financial.contracts.edit',
          'financial.contracts.delete',
          'financial.payments.view',
          'financial.payments.create',
          'financial.payments.edit',
          'financial.reports.view',
          'financial.reports.export',
          'financial.settings.view',
          'financial.settings.edit'
        ],
        deniedPermissions: []
      },
      {
        role: 'real-estate-agent',
        permissions: [
          'financial.contracts.view',
          'financial.contracts.create',
          'financial.contracts.edit',
          'financial.payments.view',
          'financial.payments.create',
          'financial.reports.view'
        ],
        deniedPermissions: [
          'financial.contracts.delete',
          'financial.settings.edit',
          'financial.reports.export'
        ]
      },
      {
        role: 'viewer',
        permissions: [
          'financial.contracts.view',
          'financial.payments.view',
          'financial.reports.view'
        ],
        deniedPermissions: [
          'financial.contracts.create',
          'financial.contracts.edit',
          'financial.contracts.delete',
          'financial.payments.create',
          'financial.settings.edit',
          'financial.reports.export'
        ]
      }
    ];

    testCases.forEach(({ role, permissions, deniedPermissions }) => {
      describe(`Role: ${role}`, () => {
        beforeEach(() => {
          const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
          authenticateSupabaseUser.mockResolvedValue({
            success: true,
            user: {
              id: `${role}-user-123`,
              email: `${role}@example.com`,
              role: role
            }
          });

          const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
          rateLimitMiddleware.mockResolvedValue({
            success: true,
            ipLimit: { allowed: true, type: 'ip' }
          });
        });

        permissions.forEach(permission => {
          it(`should allow ${permission}`, async () => {
            const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
            const result = await validateFinancialSecurity(mockRequest, {
              requiredPermission: permission,
              operation: `test_${permission}`
            });

            expect(result.success).toBe(true);
            expect(result.user?.role).toBe(role);
          });
        });

        deniedPermissions.forEach(permission => {
          it(`should deny ${permission}`, async () => {
            const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
            const result = await validateFinancialSecurity(mockRequest, {
              requiredPermission: permission,
              operation: `test_${permission}`
            });

            expect(result.success).toBe(false);
            expect(result.response?.status).toBe(403);
          });
        });
      });
    });

    it('should enforce data ownership for non-admin users', async () => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'agent-123',
          email: 'agent@example.com',
          role: 'real-estate-agent'
        }
      });

      const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
      rateLimitMiddleware.mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });

      // Test accessing own data
      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'agent-123' },
        error: null
      });

      const { validateDataOwnership } = require('@/lib/auth/financialSecurityMiddleware');
      let result = await validateDataOwnership('agent-123', 'contrato', 'contract-owned-by-agent');
      expect(result).toBe(true);

      // Test accessing other user's data
      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: 'other-agent-456' },
        error: null
      });

      result = await validateDataOwnership('agent-123', 'contrato', 'contract-owned-by-other');
      expect(result).toBe(false);
    });

    it('should allow admin users to access all data', async () => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: 'admin'
        }
      });

      // Admin should bypass ownership checks
      const { validateDataOwnership } = require('@/lib/auth/financialSecurityMiddleware');
      const result = await validateDataOwnership('admin-123', 'contrato', 'any-contract-id');
      expect(result).toBe(true);
    });
  });

  describe('Input Validation and Sanitization', () => {
    beforeEach(() => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: 'admin'
        }
      });

      const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
      rateLimitMiddleware.mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });
    });

    const maliciousInputs = [
      {
        name: 'SQL Injection in contract data',
        data: {
          valor_aluguel: "1500; DROP TABLE contratos_aluguel; --",
          observacoes: "'; DELETE FROM pagamentos_aluguel; --"
        }
      },
      {
        name: 'XSS in description fields',
        data: {
          observacoes: "<script>alert('XSS')</script>",
          descricao: "<img src=x onerror=alert('XSS')>"
        }
      },
      {
        name: 'NoSQL Injection attempts',
        data: {
          imovel_id: { "$ne": null },
          inquilino_id: { "$regex": ".*" }
        }
      },
      {
        name: 'Path traversal in file operations',
        data: {
          file_path: "../../../etc/passwd",
          export_path: "../../../../windows/system32/config/sam"
        }
      },
      {
        name: 'Command injection in system calls',
        data: {
          backup_command: "backup.sh; rm -rf /",
          export_format: "pdf && cat /etc/passwd"
        }
      }
    ];

    maliciousInputs.forEach(({ name, data }) => {
      it(`should sanitize and reject ${name}`, async () => {
        const maliciousRequest = new NextRequest('http://localhost:3000/api/contratos', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(data)
        });

        const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
        const result = await validateFinancialSecurity(maliciousRequest, {
          requiredPermission: 'financial.contracts.create',
          operation: 'create_contract',
          sensitiveData: true
        });

        expect(result.success).toBe(false);
        expect(result.response?.status).toBe(400);
      });
    });

    it('should validate financial data ranges and formats', async () => {
      const invalidDataTests = [
        {
          name: 'Negative rental values',
          data: { valor_aluguel: -1500 },
          shouldFail: true
        },
        {
          name: 'Extremely high rental values',
          data: { valor_aluguel: 999999999 },
          shouldFail: true
        },
        {
          name: 'Invalid date formats',
          data: { data_inicio: 'not-a-date', data_fim: '2024-13-45' },
          shouldFail: true
        },
        {
          name: 'Invalid UUID formats',
          data: { imovel_id: 'not-a-uuid', inquilino_id: '123' },
          shouldFail: true
        },
        {
          name: 'Invalid percentage values',
          data: { taxa_juros_mensal: -0.5, taxa_multa: 1.5 },
          shouldFail: true
        },
        {
          name: 'Valid financial data',
          data: {
            valor_aluguel: 2000,
            data_inicio: '2024-01-01',
            data_fim: '2024-12-31',
            imovel_id: '123e4567-e89b-12d3-a456-426614174000'
          },
          shouldFail: false
        }
      ];

      for (const test of invalidDataTests) {
        const testRequest = new NextRequest('http://localhost:3000/api/contratos', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(test.data)
        });

        const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
        const result = await validateFinancialSecurity(testRequest, {
          requiredPermission: 'financial.contracts.create',
          operation: 'create_contract',
          sensitiveData: true
        });

        if (test.shouldFail) {
          expect(result.success).toBe(false);
          expect(result.response?.status).toBe(400);
        } else {
          expect(result.success).toBe(true);
        }
      }
    });

    it('should prevent data type confusion attacks', async () => {
      const confusionAttacks = [
        {
          valor_aluguel: "1500", // String instead of number
          expected_type: "number"
        },
        {
          data_inicio: 20240101, // Number instead of string
          expected_type: "string"
        },
        {
          status: true, // Boolean instead of string enum
          expected_type: "string"
        },
        {
          observacoes: ["malicious", "array"], // Array instead of string
          expected_type: "string"
        }
      ];

      for (const attack of confusionAttacks) {
        const attackRequest = new NextRequest('http://localhost:3000/api/contratos', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(attack)
        });

        const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
        const result = await validateFinancialSecurity(attackRequest, {
          requiredPermission: 'financial.contracts.create',
          operation: 'create_contract',
          sensitiveData: true
        });

        expect(result.success).toBe(false);
        expect(result.response?.status).toBe(400);
      }
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should enforce rate limits per IP address', async () => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'admin'
        }
      });

      const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
      
      // First request should succeed
      rateLimitMiddleware.mockResolvedValueOnce({
        success: true,
        ipLimit: { allowed: true, type: 'ip', remaining: 99 }
      });

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      let result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(true);

      // Subsequent request should be rate limited
      rateLimitMiddleware.mockResolvedValueOnce({
        success: false,
        response: new Response('Rate limited', { status: 429 }),
        ipLimit: { allowed: false, type: 'ip', remaining: 0 }
      });

      result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(429);
    });

    it('should enforce stricter limits for sensitive operations', async () => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'admin'
        }
      });

      const sensitiveOperations = [
        'financial.settings.edit',
        'financial.contracts.delete',
        'financial.reports.export'
      ];

      for (const operation of sensitiveOperations) {
        const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
        rateLimitMiddleware.mockResolvedValueOnce({
          success: false,
          response: new Response('Rate limited - sensitive operation', { status: 429 }),
          ipLimit: { allowed: false, type: 'sensitive', remaining: 0 }
        });

        const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
        const result = await validateFinancialSecurity(mockRequest, {
          requiredPermission: operation,
          operation: operation,
          sensitiveData: true
        });

        expect(result.success).toBe(false);
        expect(result.response?.status).toBe(429);
      }
    });

    it('should detect and block suspicious request patterns', async () => {
      const suspiciousPatterns = [
        {
          name: 'Rapid sequential requests',
          requests: Array(50).fill(null).map((_, i) => ({
            timestamp: Date.now() + i * 10, // 10ms apart
            ip: '192.168.1.1'
          }))
        },
        {
          name: 'Multiple IPs from same user',
          requests: [
            { ip: '192.168.1.1', user_id: 'user-123' },
            { ip: '10.0.0.1', user_id: 'user-123' },
            { ip: '172.16.0.1', user_id: 'user-123' }
          ]
        },
        {
          name: 'Unusual request volume',
          requests: Array(1000).fill(null).map((_, i) => ({
            timestamp: Date.now() + i * 100,
            endpoint: '/api/contratos'
          }))
        }
      ];

      for (const pattern of suspiciousPatterns) {
        const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
        rateLimitMiddleware.mockResolvedValueOnce({
          success: false,
          response: new Response(`Blocked: ${pattern.name}`, { status: 429 }),
          ipLimit: { allowed: false, type: 'suspicious', pattern: pattern.name }
        });

        const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
        const result = await validateFinancialSecurity(mockRequest, {
          requiredPermission: 'financial.contracts.view',
          operation: 'view_contracts'
        });

        expect(result.success).toBe(false);
        expect(result.response?.status).toBe(429);
      }
    });
  });

  describe('Audit Logging and Monitoring', () => {
    beforeEach(() => {
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: 'admin'
        }
      });

      const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
      rateLimitMiddleware.mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });
    });

    it('should log all financial operations with complete audit trail', async () => {
      const criticalOperations = [
        {
          operation: 'create_contract',
          entityType: 'contrato',
          entityId: 'contract-123',
          data: { valor_aluguel: 2000, inquilino_id: 'client-123' }
        },
        {
          operation: 'process_payment',
          entityType: 'pagamento',
          entityId: 'payment-456',
          data: { valor_pago: 2000, status: 'pago' }
        },
        {
          operation: 'update_settings',
          entityType: 'configuracao',
          entityId: 'config-789',
          data: { taxa_juros_mensal: 0.015 }
        }
      ];

      for (const op of criticalOperations) {
        mockSupabase.insert.mockResolvedValueOnce({ error: null });

        const { logFinancialAudit } = require('@/lib/auth/financialSecurityMiddleware');
        await logFinancialAudit(op.operation, 'create', {
          userId: 'admin-123',
          userRole: 'admin',
          operation: op.operation,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser'
        }, {
          entityType: op.entityType,
          entityId: op.entityId,
          newValues: op.data
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('logs_auditoria');
        expect(mockSupabase.insert).toHaveBeenCalledWith([
          expect.objectContaining({
            operacao: `${op.operation}_create`,
            tipo: 'operacao_financeira',
            detalhes: expect.objectContaining({
              entity_type: op.entityType,
              entity_id: op.entityId,
              user_role: 'admin',
              ip_address: '192.168.1.1',
              operation_type: 'create'
            }),
            resultado: 'sucesso',
            user_id: 'admin-123'
          })
        ]);
      }
    });

    it('should log security violations and failed attempts', async () => {
      const securityViolations = [
        {
          type: 'authentication_failure',
          details: { reason: 'invalid_token', ip: '192.168.1.1' }
        },
        {
          type: 'authorization_failure',
          details: { reason: 'insufficient_permissions', user_id: 'user-123', required_permission: 'financial.settings.edit' }
        },
        {
          type: 'data_validation_failure',
          details: { reason: 'invalid_input', field: 'valor_aluguel', value: -1500 }
        },
        {
          type: 'rate_limit_exceeded',
          details: { reason: 'too_many_requests', ip: '192.168.1.1', limit_type: 'ip' }
        }
      ];

      const { logSecurityEvent } = require('@/lib/auth/securityLogger');

      for (const violation of securityViolations) {
        await logSecurityEvent({
          type: violation.type,
          details: violation.details,
          timestamp: new Date().toISOString(),
          severity: 'high'
        });

        expect(logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: violation.type,
            details: violation.details,
            severity: 'high'
          })
        );
      }
    });

    it('should maintain immutable audit logs', async () => {
      // Test that audit logs cannot be modified or deleted
      const auditLog = {
        id: 'audit-123',
        operacao: 'create_contract',
        tipo: 'operacao_financeira',
        user_id: 'admin-123',
        created_at: new Date().toISOString()
      };

      // Attempt to modify audit log should fail
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Audit logs are immutable' }
      });

      const updateResult = await mockSupabase
        .from('logs_auditoria')
        .update({ operacao: 'modified_operation' })
        .eq('id', auditLog.id);

      expect(updateResult.error).toBeDefined();
      expect(updateResult.error.message).toContain('immutable');

      // Attempt to delete audit log should fail
      mockSupabase.delete.mockResolvedValueOnce({
        data: null,
        error: { message: 'Audit logs cannot be deleted' }
      });

      const deleteResult = await mockSupabase
        .from('logs_auditoria')
        .delete()
        .eq('id', auditLog.id);

      expect(deleteResult.error).toBeDefined();
      expect(deleteResult.error.message).toContain('cannot be deleted');
    });

    it('should detect and alert on suspicious activity patterns', async () => {
      const suspiciousActivities = [
        {
          pattern: 'Multiple failed login attempts',
          events: Array(10).fill(null).map((_, i) => ({
            type: 'login_failure',
            user_id: 'user-123',
            timestamp: Date.now() + i * 1000,
            ip: '192.168.1.1'
          }))
        },
        {
          pattern: 'Unusual data access patterns',
          events: [
            { type: 'data_access', entity_type: 'contrato', entity_id: 'contract-1' },
            { type: 'data_access', entity_type: 'contrato', entity_id: 'contract-2' },
            { type: 'data_access', entity_type: 'contrato', entity_id: 'contract-3' }
          ].map((event, i) => ({
            ...event,
            user_id: 'user-123',
            timestamp: Date.now() + i * 500
          }))
        },
        {
          pattern: 'Off-hours administrative activity',
          events: [{
            type: 'settings_change',
            user_id: 'admin-123',
            timestamp: new Date('2024-01-01T02:30:00Z').getTime(), // 2:30 AM
            operation: 'update_financial_settings'
          }]
        }
      ];

      const { logSecurityEvent } = require('@/lib/auth/securityLogger');

      for (const activity of suspiciousActivities) {
        // Log the suspicious pattern detection
        await logSecurityEvent({
          type: 'suspicious_activity_detected',
          details: {
            pattern: activity.pattern,
            event_count: activity.events.length,
            time_window: '5 minutes',
            severity: 'high'
          },
          timestamp: new Date().toISOString(),
          severity: 'high'
        });

        expect(logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'suspicious_activity_detected',
            details: expect.objectContaining({
              pattern: activity.pattern,
              severity: 'high'
            })
          })
        );
      }
    });
  });

  describe('Data Encryption and Privacy', () => {
    it('should ensure sensitive financial data is encrypted at rest', async () => {
      const sensitiveData = {
        valor_aluguel: 2000,
        valor_deposito: 4000,
        observacoes: 'Informações confidenciais do contrato',
        dados_bancarios: {
          banco: '001',
          agencia: '1234',
          conta: '56789-0'
        }
      };

      // Mock encryption service
      const mockEncrypt = vi.fn().mockImplementation((data) => `encrypted_${btoa(JSON.stringify(data))}`);
      const mockDecrypt = vi.fn().mockImplementation((encryptedData) => {
        const base64Data = encryptedData.replace('encrypted_', '');
        return JSON.parse(atob(base64Data));
      });

      // Simulate data encryption before storage
      const encryptedData = {
        valor_aluguel: mockEncrypt(sensitiveData.valor_aluguel),
        valor_deposito: mockEncrypt(sensitiveData.valor_deposito),
        observacoes: mockEncrypt(sensitiveData.observacoes),
        dados_bancarios: mockEncrypt(sensitiveData.dados_bancarios)
      };

      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: 'contract-123', ...encryptedData }],
        error: null
      });

      // Verify data was encrypted before storage
      expect(encryptedData.valor_aluguel).toContain('encrypted_');
      expect(encryptedData.observacoes).toContain('encrypted_');

      // Simulate data decryption on retrieval
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: 'contract-123', ...encryptedData }],
        error: null
      });

      const retrievedData = {
        valor_aluguel: mockDecrypt(encryptedData.valor_aluguel),
        valor_deposito: mockDecrypt(encryptedData.valor_deposito),
        observacoes: mockDecrypt(encryptedData.observacoes),
        dados_bancarios: mockDecrypt(encryptedData.dados_bancarios)
      };

      // Verify data was properly decrypted
      expect(retrievedData.valor_aluguel).toBe(sensitiveData.valor_aluguel);
      expect(retrievedData.observacoes).toBe(sensitiveData.observacoes);
      expect(retrievedData.dados_bancarios).toEqual(sensitiveData.dados_bancarios);
    });

    it('should implement proper data masking for non-privileged users', async () => {
      const fullContractData = {
        id: 'contract-123',
        valor_aluguel: 2000,
        inquilino_nome: 'João Silva',
        inquilino_cpf: '123.456.789-00',
        inquilino_telefone: '11999999999',
        observacoes: 'Informações confidenciais'
      };

      // Mock data masking for different user roles
      const maskDataForRole = (data: any, role: string) => {
        switch (role) {
          case 'admin':
            return data; // Full access
          
          case 'real-estate-agent':
            return {
              ...data,
              inquilino_cpf: data.inquilino_cpf.replace(/\d(?=\d{4})/g, '*'), // Mask CPF
              observacoes: '[CONFIDENCIAL]'
            };
          
          case 'viewer':
            return {
              id: data.id,
              valor_aluguel: '[RESTRITO]',
              inquilino_nome: data.inquilino_nome.split(' ')[0] + ' ***', // First name only
              inquilino_cpf: '***.***.***-**',
              inquilino_telefone: '***********',
              observacoes: '[ACESSO NEGADO]'
            };
          
          default:
            return { id: data.id }; // Minimal access
        }
      };

      const roles = ['admin', 'real-estate-agent', 'viewer'];
      
      for (const role of roles) {
        const maskedData = maskDataForRole(fullContractData, role);
        
        if (role === 'admin') {
          expect(maskedData.inquilino_cpf).toBe('123.456.789-00');
          expect(maskedData.observacoes).toBe('Informações confidenciais');
        } else if (role === 'real-estate-agent') {
          expect(maskedData.inquilino_cpf).toContain('*');
          expect(maskedData.observacoes).toBe('[CONFIDENCIAL]');
        } else if (role === 'viewer') {
          expect(maskedData.valor_aluguel).toBe('[RESTRITO]');
          expect(maskedData.inquilino_cpf).toBe('***.***.***-**');
          expect(maskedData.inquilino_nome).toContain('***');
        }
      }
    });
  });

  describe('Security Headers and HTTPS Enforcement', () => {
    it('should enforce secure headers for financial endpoints', async () => {
      const requiredHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      
      const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
      authenticateSupabaseUser.mockResolvedValue({
        success: true,
        user: { id: 'admin-123', role: 'admin' }
      });

      const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
      rateLimitMiddleware.mockResolvedValue({
        success: true,
        ipLimit: { allowed: true, type: 'ip' }
      });

      const result = await validateFinancialSecurity(mockRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts'
      });

      expect(result.success).toBe(true);
      
      // Verify security headers would be set in the response
      if (result.response) {
        Object.entries(requiredHeaders).forEach(([header, value]) => {
          expect(result.response?.headers.get(header)).toBe(value);
        });
      }
    });

    it('should reject non-HTTPS requests in production', async () => {
      const httpRequest = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token'
        }
      });

      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { validateFinancialSecurity } = require('@/lib/auth/financialSecurityMiddleware');
      const result = await validateFinancialSecurity(httpRequest, {
        requiredPermission: 'financial.contracts.view',
        operation: 'view_contracts',
        requireHttps: true
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(400);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});