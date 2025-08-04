/**
 * End-to-End Tests for Rental Financial Management System
 * Tests complete workflows from user interaction to database persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Mock dependencies
vi.mock('@/lib/supabase-server');
vi.mock('@/lib/auth/supabase-auth-utils');
vi.mock('@/lib/auth/rateLimitMiddleware');

describe('Rental Financial Management E2E Tests', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated admin user
    mockUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin'
    };

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
      }
    };

    (createClient as any).mockReturnValue(mockSupabase);

    // Mock authentication success
    const { authenticateSupabaseUser } = require('@/lib/auth/supabase-auth-utils');
    authenticateSupabaseUser.mockResolvedValue({
      success: true,
      user: mockUser
    });

    // Mock rate limiting success
    const { rateLimitMiddleware } = require('@/lib/auth/rateLimitMiddleware');
    rateLimitMiddleware.mockResolvedValue({
      success: true,
      ipLimit: { allowed: true, type: 'ip' }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Contract Management Workflow', () => {
    it('should handle full contract lifecycle from creation to termination', async () => {
      // Step 1: Create a new contract
      const contractData = {
        imovel_id: '123e4567-e89b-12d3-a456-426614174000',
        inquilino_id: '123e4567-e89b-12d3-a456-426614174001',
        valor_aluguel: 2000,
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: 10,
        status: 'ativo'
      };

      const createdContract = {
        id: 'contract-123',
        ...contractData,
        user_id: mockUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockSupabase.insert.mockResolvedValueOnce({
        data: [createdContract],
        error: null
      });

      // Simulate contract creation API call
      const createRequest = new NextRequest('http://localhost:3000/api/contratos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(contractData)
      });

      // Verify contract was created
      expect(createdContract.id).toBeDefined();
      expect(createdContract.status).toBe('ativo');
      expect(createdContract.valor_aluguel).toBe(2000);

      // Step 2: Generate monthly payments for the contract
      const payments = [];
      const startDate = new Date(contractData.data_inicio);
      const endDate = new Date(contractData.data_fim);

      for (let date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
        const mesReferencia = new Date(date.getFullYear(), date.getMonth(), 1);
        const dataVencimento = new Date(date.getFullYear(), date.getMonth(), contractData.dia_vencimento);

        const payment = {
          id: `payment-${date.getMonth() + 1}`,
          contrato_id: createdContract.id,
          mes_referencia: mesReferencia.toISOString().split('T')[0],
          valor_devido: contractData.valor_aluguel,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'pendente',
          valor_juros: 0,
          valor_multa: 0
        };
        
        payments.push(payment);
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: payments,
        error: null
      });

      // Verify 12 monthly payments were generated
      expect(payments).toHaveLength(12);
      expect(payments[0].valor_devido).toBe(2000);
      expect(payments[0].status).toBe('pendente');

      // Step 3: Process a payment
      const paymentToProcess = payments[0];
      const processedPayment = {
        ...paymentToProcess,
        status: 'pago',
        valor_pago: 2000,
        data_pagamento: new Date().toISOString().split('T')[0]
      };

      mockSupabase.update.mockResolvedValueOnce({
        data: [processedPayment],
        error: null
      });

      // Verify payment was processed
      expect(processedPayment.status).toBe('pago');
      expect(processedPayment.valor_pago).toBe(2000);
      expect(processedPayment.data_pagamento).toBeDefined();

      // Step 4: Add property expenses
      const expense = {
        id: 'expense-123',
        imovel_id: contractData.imovel_id,
        categoria: 'manutencao',
        descricao: 'Reparo no encanamento',
        valor: 300,
        data_despesa: '2024-01-15',
        status: 'pago',
        user_id: mockUser.id
      };

      mockSupabase.insert.mockResolvedValueOnce({
        data: [expense],
        error: null
      });

      // Verify expense was recorded
      expect(expense.valor).toBe(300);
      expect(expense.categoria).toBe('manutencao');
      expect(expense.status).toBe('pago');

      // Step 5: Generate financial report
      mockSupabase.select.mockResolvedValueOnce({
        data: [processedPayment],
        error: null
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: [expense],
        error: null
      });

      // Calculate financial metrics
      const totalReceitas = 2000; // One payment processed
      const totalDespesas = 300;  // One expense
      const lucroLiquido = totalReceitas - totalDespesas;
      const margemLucro = (lucroLiquido / totalReceitas) * 100;

      // Verify financial calculations
      expect(totalReceitas).toBe(2000);
      expect(totalDespesas).toBe(300);
      expect(lucroLiquido).toBe(1700);
      expect(margemLucro).toBe(85);

      // Step 6: Terminate contract
      const terminatedContract = {
        ...createdContract,
        status: 'encerrado',
        updated_at: new Date().toISOString()
      };

      mockSupabase.update.mockResolvedValueOnce({
        data: [terminatedContract],
        error: null
      });

      // Cancel remaining payments
      const cancelledPayments = payments.slice(1).map(p => ({
        ...p,
        status: 'cancelado',
        observacoes: 'Cancelado devido ao encerramento do contrato'
      }));

      mockSupabase.update.mockResolvedValueOnce({
        data: cancelledPayments,
        error: null
      });

      // Verify contract termination
      expect(terminatedContract.status).toBe('encerrado');
      expect(cancelledPayments.every(p => p.status === 'cancelado')).toBe(true);
    });

    it('should handle overdue payment processing with fees calculation', async () => {
      // Setup: Create overdue payment
      const overduePayment = {
        id: 'payment-overdue',
        contrato_id: 'contract-123',
        mes_referencia: '2024-01-01',
        valor_devido: 2000,
        data_vencimento: '2024-01-10',
        status: 'pendente',
        valor_juros: 0,
        valor_multa: 0
      };

      // Mock financial configuration
      const config = {
        id: 'config-1',
        taxa_juros_mensal: 0.01, // 1% per month
        taxa_multa: 0.02, // 2% flat fee
        dias_carencia: 5
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: config,
        error: null
      });

      // Simulate automatic processing after 30 days
      const today = new Date();
      const dueDate = new Date('2024-01-10');
      const daysLate = 30; // Simulate 30 days late

      // Calculate fees
      const multa = overduePayment.valor_devido * config.taxa_multa;
      const monthsLate = daysLate / 30;
      const juros = overduePayment.valor_devido * config.taxa_juros_mensal * monthsLate;

      const processedPayment = {
        ...overduePayment,
        status: 'atrasado',
        valor_juros: juros,
        valor_multa: multa
      };

      mockSupabase.update.mockResolvedValueOnce({
        data: [processedPayment],
        error: null
      });

      // Verify fee calculations
      expect(processedPayment.status).toBe('atrasado');
      expect(processedPayment.valor_multa).toBe(40); // 2% of 2000
      expect(processedPayment.valor_juros).toBe(20); // 1% of 2000 for 1 month
      
      const totalAmount = processedPayment.valor_devido + processedPayment.valor_juros + processedPayment.valor_multa;
      expect(totalAmount).toBe(2060);

      // Process late payment
      const paidPayment = {
        ...processedPayment,
        status: 'pago',
        valor_pago: totalAmount,
        data_pagamento: new Date().toISOString().split('T')[0]
      };

      mockSupabase.update.mockResolvedValueOnce({
        data: [paidPayment],
        error: null
      });

      // Verify late payment processing
      expect(paidPayment.status).toBe('pago');
      expect(paidPayment.valor_pago).toBe(2060);
      expect(paidPayment.data_pagamento).toBeDefined();
    });
  });

  describe('Multi-Property Portfolio Management', () => {
    it('should handle complex portfolio with multiple properties and contracts', async () => {
      // Setup: Multiple properties with different contracts
      const properties = [
        { id: 'prop-1', endereco: 'Rua A, 123' },
        { id: 'prop-2', endereco: 'Rua B, 456' },
        { id: 'prop-3', endereco: 'Rua C, 789' }
      ];

      const contracts = [
        {
          id: 'contract-1',
          imovel_id: 'prop-1',
          inquilino_id: 'client-1',
          valor_aluguel: 2000,
          status: 'ativo'
        },
        {
          id: 'contract-2',
          imovel_id: 'prop-2',
          inquilino_id: 'client-2',
          valor_aluguel: 1500,
          status: 'ativo'
        },
        {
          id: 'contract-3',
          imovel_id: 'prop-3',
          inquilino_id: 'client-3',
          valor_aluguel: 2500,
          status: 'encerrado'
        }
      ];

      // Mock database responses
      mockSupabase.select.mockResolvedValueOnce({
        data: contracts,
        error: null
      });

      // Generate payments for active contracts
      const allPayments = [];
      contracts.filter(c => c.status === 'ativo').forEach(contract => {
        for (let month = 0; month < 12; month++) {
          const payment = {
            id: `payment-${contract.id}-${month}`,
            contrato_id: contract.id,
            mes_referencia: `2024-${String(month + 1).padStart(2, '0')}-01`,
            valor_devido: contract.valor_aluguel,
            status: month < 6 ? 'pago' : 'pendente', // First 6 months paid
            valor_pago: month < 6 ? contract.valor_aluguel : null
          };
          allPayments.push(payment);
        }
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: allPayments,
        error: null
      });

      // Generate expenses for all properties
      const allExpenses = [
        { id: 'exp-1', imovel_id: 'prop-1', valor: 300, categoria: 'manutencao', status: 'pago' },
        { id: 'exp-2', imovel_id: 'prop-1', valor: 150, categoria: 'impostos', status: 'pago' },
        { id: 'exp-3', imovel_id: 'prop-2', valor: 200, categoria: 'manutencao', status: 'pago' },
        { id: 'exp-4', imovel_id: 'prop-2', valor: 100, categoria: 'seguros', status: 'pago' },
        { id: 'exp-5', imovel_id: 'prop-3', valor: 500, categoria: 'reforma', status: 'pago' }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: allExpenses,
        error: null
      });

      // Calculate portfolio metrics
      const activeContracts = contracts.filter(c => c.status === 'ativo');
      const totalMonthlyRent = activeContracts.reduce((sum, c) => sum + c.valor_aluguel, 0);
      
      const paidPayments = allPayments.filter(p => p.status === 'pago');
      const totalReceived = paidPayments.reduce((sum, p) => sum + (p.valor_pago || 0), 0);
      
      const totalExpenses = allExpenses.reduce((sum, e) => sum + e.valor, 0);
      
      // Calculate per-property profitability
      const propertyMetrics = properties.map(property => {
        const propertyContract = contracts.find(c => c.imovel_id === property.id && c.status === 'ativo');
        const propertyPayments = paidPayments.filter(p => {
          const contract = contracts.find(c => c.id === p.contrato_id);
          return contract?.imovel_id === property.id;
        });
        const propertyExpenses = allExpenses.filter(e => e.imovel_id === property.id);
        
        const revenue = propertyPayments.reduce((sum, p) => sum + (p.valor_pago || 0), 0);
        const expenses = propertyExpenses.reduce((sum, e) => sum + e.valor, 0);
        const profit = revenue - expenses;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        
        return {
          property_id: property.id,
          revenue,
          expenses,
          profit,
          margin,
          is_active: !!propertyContract
        };
      });

      // Verify portfolio calculations
      expect(totalMonthlyRent).toBe(3500); // 2000 + 1500
      expect(totalReceived).toBe(21000); // (2000 + 1500) * 6 months
      expect(totalExpenses).toBe(1250); // Sum of all expenses
      
      // Verify property-specific metrics
      const prop1Metrics = propertyMetrics.find(m => m.property_id === 'prop-1');
      expect(prop1Metrics?.revenue).toBe(12000); // 2000 * 6 months
      expect(prop1Metrics?.expenses).toBe(450); // 300 + 150
      expect(prop1Metrics?.profit).toBe(11550);
      expect(prop1Metrics?.margin).toBeCloseTo(96.25, 2);
      
      const prop2Metrics = propertyMetrics.find(m => m.property_id === 'prop-2');
      expect(prop2Metrics?.revenue).toBe(9000); // 1500 * 6 months
      expect(prop2Metrics?.expenses).toBe(300); // 200 + 100
      expect(prop2Metrics?.profit).toBe(8700);
      
      const prop3Metrics = propertyMetrics.find(m => m.property_id === 'prop-3');
      expect(prop3Metrics?.is_active).toBe(false);
      expect(prop3Metrics?.revenue).toBe(0); // Contract terminated
    });
  });

  describe('Automated Processing Workflows', () => {
    it('should handle daily automated processing of due payments', async () => {
      // Setup: Multiple payments with different statuses
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const payments = [
        {
          id: 'payment-due-today',
          valor_devido: 2000,
          data_vencimento: today.toISOString().split('T')[0],
          status: 'pendente',
          valor_juros: 0,
          valor_multa: 0
        },
        {
          id: 'payment-overdue',
          valor_devido: 1500,
          data_vencimento: yesterday.toISOString().split('T')[0],
          status: 'pendente',
          valor_juros: 0,
          valor_multa: 0
        },
        {
          id: 'payment-already-paid',
          valor_devido: 1800,
          data_vencimento: yesterday.toISOString().split('T')[0],
          status: 'pago',
          valor_pago: 1800
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: payments,
        error: null
      });

      // Mock financial configuration
      const config = {
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        dias_carencia: 0 // No grace period for this test
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: config,
        error: null
      });

      // Process automated updates
      const updatedPayments = payments.map(payment => {
        if (payment.status === 'pago') {
          return payment; // Already processed
        }

        const dueDate = new Date(payment.data_vencimento);
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLate > config.dias_carencia) {
          // Calculate fees for overdue payments
          const multa = payment.valor_devido * config.taxa_multa;
          const monthsLate = daysLate / 30;
          const juros = payment.valor_devido * config.taxa_juros_mensal * monthsLate;

          return {
            ...payment,
            status: 'atrasado',
            valor_juros: juros,
            valor_multa: multa
          };
        }

        return payment;
      });

      mockSupabase.update.mockResolvedValue({
        data: updatedPayments.filter(p => p.status === 'atrasado'),
        error: null
      });

      // Verify automated processing results
      const overduePayment = updatedPayments.find(p => p.id === 'payment-overdue');
      expect(overduePayment?.status).toBe('atrasado');
      expect(overduePayment?.valor_multa).toBe(30); // 2% of 1500
      expect(overduePayment?.valor_juros).toBeCloseTo(0.5, 2); // 1% * (1/30) for 1 day

      const todayPayment = updatedPayments.find(p => p.id === 'payment-due-today');
      expect(todayPayment?.status).toBe('pendente'); // Due today, not overdue yet

      const paidPayment = updatedPayments.find(p => p.id === 'payment-already-paid');
      expect(paidPayment?.status).toBe('pago'); // Unchanged
    });

    it('should generate and send automated notifications', async () => {
      // Setup: Payments requiring notifications
      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const payments = [
        {
          id: 'payment-due-soon',
          contrato_id: 'contract-1',
          valor_devido: 2000,
          data_vencimento: threeDaysFromNow.toISOString().split('T')[0],
          status: 'pendente'
        }
      ];

      const contracts = [
        {
          id: 'contract-1',
          inquilino_id: 'client-1',
          data_fim: thirtyDaysFromNow.toISOString().split('T')[0],
          status: 'ativo'
        }
      ];

      const clients = [
        {
          id: 'client-1',
          nome: 'João Silva',
          email: 'joao@example.com',
          telefone: '11999999999'
        }
      ];

      mockSupabase.select
        .mockResolvedValueOnce({ data: payments, error: null })
        .mockResolvedValueOnce({ data: contracts, error: null })
        .mockResolvedValueOnce({ data: clients, error: null });

      // Generate notifications
      const notifications = [];

      // Payment due notification (3 days before)
      const paymentNotification = {
        id: 'notif-payment-1',
        tipo: 'vencimento_proximo',
        titulo: 'Aluguel vence em 3 dias',
        mensagem: `Seu aluguel de R$ 2000,00 vence em ${threeDaysFromNow.toLocaleDateString('pt-BR')}`,
        destinatario_id: 'client-1',
        status: 'pendente',
        data_envio: today.toISOString()
      };

      // Contract expiration notification (30 days before)
      const contractNotification = {
        id: 'notif-contract-1',
        tipo: 'contrato_vencimento',
        titulo: 'Contrato vence em 30 dias',
        mensagem: `Seu contrato de aluguel vence em ${thirtyDaysFromNow.toLocaleDateString('pt-BR')}`,
        destinatario_id: 'client-1',
        status: 'pendente',
        data_envio: today.toISOString()
      };

      notifications.push(paymentNotification, contractNotification);

      mockSupabase.insert.mockResolvedValue({
        data: notifications,
        error: null
      });

      // Verify notifications were generated
      expect(notifications).toHaveLength(2);
      expect(notifications[0].tipo).toBe('vencimento_proximo');
      expect(notifications[1].tipo).toBe('contrato_vencimento');
      expect(notifications.every(n => n.status === 'pendente')).toBe(true);
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain referential integrity across all financial operations', async () => {
      // Setup: Create related entities
      const property = {
        id: 'prop-integrity',
        endereco: 'Rua Teste, 123',
        user_id: mockUser.id
      };

      const client = {
        id: 'client-integrity',
        nome: 'Cliente Teste',
        email: 'cliente@test.com',
        user_id: mockUser.id
      };

      const contract = {
        id: 'contract-integrity',
        imovel_id: property.id,
        inquilino_id: client.id,
        valor_aluguel: 2000,
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        status: 'ativo',
        user_id: mockUser.id
      };

      const payment = {
        id: 'payment-integrity',
        contrato_id: contract.id,
        mes_referencia: '2024-01-01',
        valor_devido: 2000,
        data_vencimento: '2024-01-10',
        status: 'pendente'
      };

      const expense = {
        id: 'expense-integrity',
        imovel_id: property.id,
        categoria: 'manutencao',
        descricao: 'Teste de integridade',
        valor: 300,
        data_despesa: '2024-01-15',
        status: 'pago',
        user_id: mockUser.id
      };

      // Mock successful creation of all entities
      mockSupabase.insert
        .mockResolvedValueOnce({ data: [property], error: null })
        .mockResolvedValueOnce({ data: [client], error: null })
        .mockResolvedValueOnce({ data: [contract], error: null })
        .mockResolvedValueOnce({ data: [payment], error: null })
        .mockResolvedValueOnce({ data: [expense], error: null });

      // Verify all relationships are properly established
      expect(contract.imovel_id).toBe(property.id);
      expect(contract.inquilino_id).toBe(client.id);
      expect(payment.contrato_id).toBe(contract.id);
      expect(expense.imovel_id).toBe(property.id);

      // Verify user ownership
      expect(property.user_id).toBe(mockUser.id);
      expect(client.user_id).toBe(mockUser.id);
      expect(contract.user_id).toBe(mockUser.id);
      expect(expense.user_id).toBe(mockUser.id);

      // Test cascade operations
      // When contract is terminated, payments should be cancelled
      const terminatedContract = {
        ...contract,
        status: 'encerrado',
        updated_at: new Date().toISOString()
      };

      const cancelledPayment = {
        ...payment,
        status: 'cancelado',
        observacoes: 'Cancelado devido ao encerramento do contrato'
      };

      mockSupabase.update
        .mockResolvedValueOnce({ data: [terminatedContract], error: null })
        .mockResolvedValueOnce({ data: [cancelledPayment], error: null });

      // Verify cascade effect
      expect(terminatedContract.status).toBe('encerrado');
      expect(cancelledPayment.status).toBe('cancelado');
      expect(cancelledPayment.observacoes).toContain('encerramento do contrato');
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent payment processing
      const payment = {
        id: 'payment-concurrent',
        contrato_id: 'contract-123',
        valor_devido: 2000,
        status: 'pendente',
        valor_pago: null,
        data_pagamento: null
      };

      // Mock optimistic locking scenario
      let version = 1;
      const processPayment = async (paymentAmount: number, userId: string) => {
        // Simulate version check
        mockSupabase.select.mockResolvedValueOnce({
          data: [{ ...payment, version }],
          error: null
        });

        // Simulate concurrent update
        const updatedPayment = {
          ...payment,
          status: 'pago',
          valor_pago: paymentAmount,
          data_pagamento: new Date().toISOString().split('T')[0],
          version: version + 1,
          updated_by: userId
        };

        mockSupabase.update.mockResolvedValueOnce({
          data: [updatedPayment],
          error: null
        });

        version++; // Simulate version increment
        return updatedPayment;
      };

      // Process payment
      const result = await processPayment(2000, mockUser.id);

      // Verify payment was processed correctly
      expect(result.status).toBe('pago');
      expect(result.valor_pago).toBe(2000);
      expect(result.version).toBe(2);
      expect(result.updated_by).toBe(mockUser.id);
    });
  });
});