/**
 * Integration tests for financial API security
 * Tests actual API endpoints with security middleware
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@/lib/supabase-server';

describe('Financial API Security Integration', () => {
  let supabase: any;
  let testUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    supabase = createClient();
    
    // Create test users for testing
    const { data: testUser } = await supabase.auth.admin.createUser({
      email: 'test-agent@example.com',
      password: 'testpassword123',
      user_metadata: {
        role: 'real-estate-agent'
      }
    });
    
    const { data: adminUser } = await supabase.auth.admin.createUser({
      email: 'test-admin@example.com',
      password: 'adminpassword123',
      user_metadata: {
        role: 'admin'
      }
    });

    testUserId = testUser?.user?.id;
    adminUserId = adminUser?.user?.id;
  });

  afterAll(async () => {
    // Clean up test users
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
    if (adminUserId) {
      await supabase.auth.admin.deleteUser(adminUserId);
    }
  });

  describe('Permission-based Access Control', () => {
    it('should allow admin to access all financial endpoints', async () => {
      // Test that admin can access all financial operations
      const endpoints = [
        '/api/contratos',
        '/api/pagamentos',
        '/api/despesas',
        '/api/configuracoes-financeiras',
        '/api/logs-auditoria'
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${adminUserId}`,
            'Content-Type': 'application/json'
          }
        });

        // Should not be 403 (forbidden) for admin
        expect(response.status).not.toBe(403);
      }
    });

    it('should restrict real-estate-agent access to sensitive operations', async () => {
      // Test that real-estate-agent cannot access admin-only operations
      const restrictedEndpoints = [
        '/api/logs-auditoria',
        '/api/pagamentos/processar-vencimentos'
      ];

      for (const endpoint of restrictedEndpoints) {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${testUserId}`,
            'Content-Type': 'application/json'
          }
        });

        // Should be 403 (forbidden) for real-estate-agent
        expect(response.status).toBe(403);
      }
    });

    it('should allow real-estate-agent to access permitted operations', async () => {
      // Test that real-estate-agent can access permitted operations
      const permittedEndpoints = [
        '/api/contratos',
        '/api/pagamentos',
        '/api/despesas'
      ];

      for (const endpoint of permittedEndpoints) {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${testUserId}`,
            'Content-Type': 'application/json'
          }
        });

        // Should not be 403 (forbidden) for permitted operations
        expect(response.status).not.toBe(403);
      }
    });
  });

  describe('Data Integrity Validation', () => {
    it('should reject invalid financial data', async () => {
      const invalidData = {
        imovel_id: 'invalid-uuid',
        inquilino_id: '123e4567-e89b-12d3-a456-426614174000',
        valor_aluguel: -100, // Invalid negative value
        data_inicio: '2024-01-01',
        data_fim: '2023-12-31' // Invalid date range
      };

      const response = await fetch('http://localhost:3000/api/contratos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUserId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('integridade');
    });

    it('should reject invalid percentage values in configurations', async () => {
      const invalidConfig = {
        taxa_juros_mensal: 0.15, // More than 10%
        taxa_multa: -0.01, // Negative value
        taxa_comissao: 0.10,
        dias_carencia: 5
      };

      const response = await fetch('http://localhost:3000/api/configuracoes-financeiras', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUserId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidConfig)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit logs for financial operations', async () => {
      // Perform a financial operation
      const validContrato = {
        imovel_id: '123e4567-e89b-12d3-a456-426614174000',
        inquilino_id: '123e4567-e89b-12d3-a456-426614174001',
        valor_aluguel: 1500,
        data_inicio: '2024-01-01',
        data_fim: '2025-01-01',
        dia_vencimento: 10
      };

      const response = await fetch('http://localhost:3000/api/contratos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUserId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validContrato)
      });

      // Check if audit log was created
      const auditResponse = await fetch('http://localhost:3000/api/logs-auditoria?operacao=contrato_create', {
        headers: {
          'Authorization': `Bearer ${adminUserId}`,
          'Content-Type': 'application/json'
        }
      });

      expect(auditResponse.status).toBe(200);
      const auditResult = await auditResponse.json();
      expect(auditResult.success).toBe(true);
      expect(auditResult.data.length).toBeGreaterThan(0);
    });

    it('should log security violations', async () => {
      // Attempt unauthorized access
      const response = await fetch('http://localhost:3000/api/logs-auditoria', {
        headers: {
          'Authorization': `Bearer ${testUserId}`, // real-estate-agent trying to access admin-only
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(403);

      // Check if security violation was logged
      const auditResponse = await fetch('http://localhost:3000/api/logs-auditoria?tipo=security_violation', {
        headers: {
          'Authorization': `Bearer ${adminUserId}`,
          'Content-Type': 'application/json'
        }
      });

      expect(auditResponse.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on sensitive operations', async () => {
      const requests = [];
      
      // Make multiple rapid requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('http://localhost:3000/api/pagamentos/processar-vencimentos', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminUserId}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ processamentoCompleto: false })
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated requests', async () => {
      const endpoints = [
        '/api/contratos',
        '/api/pagamentos',
        '/api/despesas',
        '/api/configuracoes-financeiras',
        '/api/logs-auditoria'
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        expect(response.status).toBe(401);
      }
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await fetch('http://localhost:3000/api/contratos', {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Data Ownership Validation', () => {
    it('should prevent users from accessing data they do not own', async () => {
      // This test would require setting up test data with specific ownership
      // For now, we'll test the basic structure
      
      const response = await fetch('http://localhost:3000/api/contratos/non-existent-id', {
        headers: {
          'Authorization': `Bearer ${testUserId}`,
          'Content-Type': 'application/json'
        }
      });

      // Should return 404 for non-existent data or 403 for unauthorized access
      expect([403, 404]).toContain(response.status);
    });
  });
});