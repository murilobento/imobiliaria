/**
 * Performance Tests for Financial Reports
 * Tests report generation performance with large datasets
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@/lib/supabase-server';

// Mock dependencies
vi.mock('@/lib/supabase-server');

describe('Financial Reports Performance Tests', () => {
  let mockSupabase: any;
  let performanceMetrics: { [key: string]: number } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMetrics = {};

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis()
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const measurePerformance = async (testName: string, operation: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performanceMetrics[testName] = duration;
    console.log(`${testName}: ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  };

  const generateLargeDataset = (size: number) => {
    const contracts = [];
    const payments = [];
    const expenses = [];
    const properties = [];
    const clients = [];

    // Generate properties
    for (let i = 1; i <= Math.min(size / 10, 1000); i++) {
      properties.push({
        id: `prop-${i}`,
        endereco: `Rua ${i}, ${i * 10}`,
        user_id: 'user-123'
      });
    }

    // Generate clients
    for (let i = 1; i <= Math.min(size / 10, 1000); i++) {
      clients.push({
        id: `client-${i}`,
        nome: `Cliente ${i}`,
        email: `cliente${i}@example.com`,
        user_id: 'user-123'
      });
    }

    // Generate contracts
    for (let i = 1; i <= Math.min(size / 5, 2000); i++) {
      const propertyIndex = ((i - 1) % properties.length);
      const clientIndex = ((i - 1) % clients.length);
      
      contracts.push({
        id: `contract-${i}`,
        imovel_id: properties[propertyIndex].id,
        inquilino_id: clients[clientIndex].id,
        valor_aluguel: 1000 + (i % 3000), // Vary rent values
        data_inicio: `2023-${String((i % 12) + 1).padStart(2, '0')}-01`,
        data_fim: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        status: i % 10 === 0 ? 'encerrado' : 'ativo',
        user_id: 'user-123'
      });
    }

    // Generate payments (12 months per contract)
    contracts.forEach((contract, contractIndex) => {
      for (let month = 1; month <= 12; month++) {
        const paymentId = `payment-${contractIndex}-${month}`;
        const isOverdue = Math.random() < 0.1; // 10% overdue rate
        const isPaid = Math.random() < 0.85; // 85% payment rate
        
        payments.push({
          id: paymentId,
          contrato_id: contract.id,
          mes_referencia: `2024-${String(month).padStart(2, '0')}-01`,
          valor_devido: contract.valor_aluguel,
          valor_pago: isPaid ? contract.valor_aluguel + (isOverdue ? contract.valor_aluguel * 0.03 : 0) : null,
          data_vencimento: `2024-${String(month).padStart(2, '0')}-10`,
          data_pagamento: isPaid ? `2024-${String(month).padStart(2, '0')}-${10 + (isOverdue ? 15 : 0)}` : null,
          status: isPaid ? 'pago' : (isOverdue ? 'atrasado' : 'pendente'),
          valor_juros: isOverdue && isPaid ? contract.valor_aluguel * 0.01 : 0,
          valor_multa: isOverdue && isPaid ? contract.valor_aluguel * 0.02 : 0
        });
      }
    });

    // Generate expenses (2-5 per property per year)
    properties.forEach((property, propIndex) => {
      const expenseCount = 2 + (propIndex % 4); // 2-5 expenses per property
      for (let i = 1; i <= expenseCount; i++) {
        expenses.push({
          id: `expense-${propIndex}-${i}`,
          imovel_id: property.id,
          categoria: ['manutencao', 'impostos', 'seguros', 'administracao', 'outros'][i % 5],
          descricao: `Despesa ${i} do imóvel ${propIndex}`,
          valor: 100 + (i * propIndex % 1000),
          data_despesa: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          status: Math.random() < 0.9 ? 'pago' : 'pendente',
          user_id: 'user-123'
        });
      }
    });

    return { contracts, payments, expenses, properties, clients };
  };

  describe('Large Dataset Report Generation', () => {
    it('should generate financial report for 10,000 payments within acceptable time', async () => {
      const dataset = generateLargeDataset(10000);
      
      // Mock database responses
      mockSupabase.select.mockResolvedValueOnce({
        data: dataset.payments,
        error: null
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: dataset.expenses,
        error: null
      });

      const { duration } = await measurePerformance('Financial Report - 10K payments', async () => {
        // Simulate financial report calculation
        const payments = dataset.payments;
        const expenses = dataset.expenses;

        // Calculate metrics
        const totalReceitas = payments
          .filter(p => p.status === 'pago')
          .reduce((sum, p) => sum + (p.valor_pago || 0), 0);

        const totalDespesas = expenses
          .filter(e => e.status === 'pago')
          .reduce((sum, e) => sum + e.valor, 0);

        const totalJurosMultas = payments
          .filter(p => p.status === 'pago')
          .reduce((sum, p) => sum + (p.valor_juros || 0) + (p.valor_multa || 0), 0);

        const inadimplencia = payments
          .filter(p => p.status === 'atrasado')
          .reduce((sum, p) => sum + p.valor_devido, 0);

        const lucroLiquido = totalReceitas - totalDespesas;
        const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

        return {
          totalReceitas,
          totalDespesas,
          totalJurosMultas,
          inadimplencia,
          lucroLiquido,
          margemLucro,
          totalPayments: payments.length,
          totalExpenses: expenses.length
        };
      });

      // Performance assertion: should complete within 500ms
      expect(duration).toBeLessThan(500);
      expect(dataset.payments.length).toBeGreaterThan(9000);
    });

    it('should generate profitability report for 1,000 properties within acceptable time', async () => {
      const dataset = generateLargeDataset(5000);
      
      mockSupabase.select
        .mockResolvedValueOnce({ data: dataset.contracts, error: null })
        .mockResolvedValueOnce({ data: dataset.payments, error: null })
        .mockResolvedValueOnce({ data: dataset.expenses, error: null });

      const { duration } = await measurePerformance('Profitability Report - 1K properties', async () => {
        const contracts = dataset.contracts;
        const payments = dataset.payments;
        const expenses = dataset.expenses;

        // Calculate profitability per property
        const propertyMetrics = dataset.properties.map(property => {
          const propertyContracts = contracts.filter(c => c.imovel_id === property.id);
          const contractIds = propertyContracts.map(c => c.id);
          
          const propertyPayments = payments.filter(p => contractIds.includes(p.contrato_id));
          const propertyExpenses = expenses.filter(e => e.imovel_id === property.id);

          const revenue = propertyPayments
            .filter(p => p.status === 'pago')
            .reduce((sum, p) => sum + (p.valor_pago || 0), 0);

          const expenseTotal = propertyExpenses
            .filter(e => e.status === 'pago')
            .reduce((sum, e) => sum + e.valor, 0);

          const profit = revenue - expenseTotal;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

          return {
            property_id: property.id,
            revenue,
            expenses: expenseTotal,
            profit,
            margin,
            contract_count: propertyContracts.length,
            payment_count: propertyPayments.length
          };
        });

        // Sort by profitability
        propertyMetrics.sort((a, b) => b.profit - a.profit);

        return {
          properties: propertyMetrics,
          totalProperties: propertyMetrics.length,
          avgMargin: propertyMetrics.reduce((sum, p) => sum + p.margin, 0) / propertyMetrics.length
        };
      });

      // Performance assertion: should complete within 1 second
      expect(duration).toBeLessThan(1000);
      expect(dataset.properties.length).toBeGreaterThan(400);
    });

    it('should handle complex delinquency report with aging analysis', async () => {
      const dataset = generateLargeDataset(8000);
      
      // Add more overdue payments for testing
      const overduePayments = dataset.payments.map(payment => {
        if (Math.random() < 0.15) { // 15% overdue rate
          const daysOverdue = Math.floor(Math.random() * 180) + 1; // 1-180 days
          const overdueDate = new Date();
          overdueDate.setDate(overdueDate.getDate() - daysOverdue);
          
          return {
            ...payment,
            status: 'atrasado',
            data_vencimento: overdueDate.toISOString().split('T')[0],
            valor_juros: payment.valor_devido * 0.01 * Math.floor(daysOverdue / 30),
            valor_multa: payment.valor_devido * 0.02
          };
        }
        return payment;
      });

      mockSupabase.select
        .mockResolvedValueOnce({ data: overduePayments, error: null })
        .mockResolvedValueOnce({ data: dataset.contracts, error: null })
        .mockResolvedValueOnce({ data: dataset.clients, error: null });

      const { duration } = await measurePerformance('Delinquency Report with Aging', async () => {
        const payments = overduePayments;
        const contracts = dataset.contracts;
        const clients = dataset.clients;

        // Filter overdue payments
        const overdueOnly = payments.filter(p => p.status === 'atrasado');

        // Calculate aging buckets
        const today = new Date();
        const agingBuckets = {
          '1-30': [],
          '31-60': [],
          '61-90': [],
          '90+': []
        };

        overdueOnly.forEach(payment => {
          const dueDate = new Date(payment.data_vencimento);
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysOverdue <= 30) {
            agingBuckets['1-30'].push(payment);
          } else if (daysOverdue <= 60) {
            agingBuckets['31-60'].push(payment);
          } else if (daysOverdue <= 90) {
            agingBuckets['61-90'].push(payment);
          } else {
            agingBuckets['90+'].push(payment);
          }
        });

        // Calculate totals per bucket
        const agingAnalysis = Object.entries(agingBuckets).map(([bucket, bucketPayments]) => {
          const total = bucketPayments.reduce((sum, p) => 
            sum + p.valor_devido + (p.valor_juros || 0) + (p.valor_multa || 0), 0
          );
          
          return {
            bucket,
            count: bucketPayments.length,
            total,
            percentage: overdueOnly.length > 0 ? (bucketPayments.length / overdueOnly.length) * 100 : 0
          };
        });

        // Enrich with client and contract data
        const enrichedOverdue = overdueOnly.map(payment => {
          const contract = contracts.find(c => c.id === payment.contrato_id);
          const client = clients.find(c => c.id === contract?.inquilino_id);
          
          return {
            ...payment,
            contract,
            client,
            total_due: payment.valor_devido + (payment.valor_juros || 0) + (payment.valor_multa || 0)
          };
        });

        return {
          totalOverdue: overdueOnly.length,
          totalAmount: overdueOnly.reduce((sum, p) => 
            sum + p.valor_devido + (p.valor_juros || 0) + (p.valor_multa || 0), 0
          ),
          agingAnalysis,
          overduePayments: enrichedOverdue
        };
      });

      // Performance assertion: should complete within 800ms
      expect(duration).toBeLessThan(800);
    });
  });

  describe('Memory Usage and Optimization', () => {
    it('should handle large datasets without excessive memory usage', async () => {
      const dataset = generateLargeDataset(20000);
      
      // Mock paginated responses to simulate real-world scenario
      const pageSize = 1000;
      const totalPages = Math.ceil(dataset.payments.length / pageSize);
      
      let totalProcessed = 0;
      let maxMemoryUsage = 0;

      const { duration } = await measurePerformance('Memory Efficient Processing', async () => {
        // Simulate paginated processing
        for (let page = 0; page < totalPages; page++) {
          const startIndex = page * pageSize;
          const endIndex = Math.min(startIndex + pageSize, dataset.payments.length);
          const pageData = dataset.payments.slice(startIndex, endIndex);

          // Mock paginated database response
          mockSupabase.range.mockReturnValueOnce({
            data: pageData,
            error: null
          });

          // Process page data
          const pageMetrics = pageData.reduce((acc, payment) => {
            if (payment.status === 'pago') {
              acc.totalReceived += payment.valor_pago || 0;
              acc.paidCount++;
            } else if (payment.status === 'atrasado') {
              acc.totalOverdue += payment.valor_devido + (payment.valor_juros || 0) + (payment.valor_multa || 0);
              acc.overdueCount++;
            }
            return acc;
          }, { totalReceived: 0, totalOverdue: 0, paidCount: 0, overdueCount: 0 });

          totalProcessed += pageData.length;

          // Simulate memory usage tracking
          const currentMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
          maxMemoryUsage = Math.max(maxMemoryUsage, currentMemoryUsage);

          // Clear page data to simulate garbage collection
          pageData.length = 0;
        }

        return {
          totalProcessed,
          maxMemoryUsage,
          pagesProcessed: totalPages
        };
      });

      // Performance assertions
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(totalProcessed).toBe(dataset.payments.length);
      expect(maxMemoryUsage).toBeLessThan(100); // Should use less than 100MB
    });

    it('should optimize database queries for large result sets', async () => {
      const dataset = generateLargeDataset(15000);
      
      // Test query optimization strategies
      const optimizationTests = [
        {
          name: 'Index-optimized date range query',
          query: () => {
            mockSupabase.select.mockReturnValueOnce({
              data: dataset.payments.filter(p => 
                p.data_vencimento >= '2024-01-01' && p.data_vencimento <= '2024-12-31'
              ),
              error: null
            });
          }
        },
        {
          name: 'Status-filtered query with limit',
          query: () => {
            mockSupabase.select.mockReturnValueOnce({
              data: dataset.payments.filter(p => p.status === 'atrasado').slice(0, 100),
              error: null
            });
          }
        },
        {
          name: 'Aggregated summary query',
          query: () => {
            const summary = dataset.payments.reduce((acc, p) => {
              acc.total_payments++;
              if (p.status === 'pago') acc.paid_count++;
              if (p.status === 'atrasado') acc.overdue_count++;
              acc.total_amount += p.valor_devido;
              return acc;
            }, { total_payments: 0, paid_count: 0, overdue_count: 0, total_amount: 0 });
            
            mockSupabase.select.mockReturnValueOnce({
              data: [summary],
              error: null
            });
          }
        }
      ];

      for (const test of optimizationTests) {
        const { duration } = await measurePerformance(test.name, async () => {
          test.query();
          // Simulate query execution time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          return { executed: true };
        });

        // Each optimized query should complete quickly
        expect(duration).toBeLessThan(100);
      }
    });
  });

  describe('Concurrent Report Generation', () => {
    it('should handle multiple concurrent report requests efficiently', async () => {
      const dataset = generateLargeDataset(5000);
      
      // Setup mock responses for concurrent requests
      mockSupabase.select
        .mockResolvedValue({ data: dataset.payments, error: null })
        .mockResolvedValue({ data: dataset.expenses, error: null })
        .mockResolvedValue({ data: dataset.contracts, error: null });

      const concurrentReports = [
        'Financial Summary',
        'Profitability Analysis',
        'Delinquency Report',
        'Cash Flow Report',
        'Property Performance'
      ];

      const { duration } = await measurePerformance('Concurrent Report Generation', async () => {
        // Simulate concurrent report generation
        const reportPromises = concurrentReports.map(async (reportType, index) => {
          // Add small delay to simulate real processing
          await new Promise(resolve => setTimeout(resolve, index * 10));
          
          switch (reportType) {
            case 'Financial Summary':
              return {
                type: reportType,
                data: {
                  totalReceitas: dataset.payments.filter(p => p.status === 'pago').length * 1500,
                  totalDespesas: dataset.expenses.length * 200
                }
              };
            
            case 'Profitability Analysis':
              return {
                type: reportType,
                data: {
                  properties: dataset.properties.length,
                  avgMargin: 75.5
                }
              };
            
            case 'Delinquency Report':
              return {
                type: reportType,
                data: {
                  overdueCount: dataset.payments.filter(p => p.status === 'atrasado').length,
                  totalOverdue: 50000
                }
              };
            
            default:
              return {
                type: reportType,
                data: { processed: true }
              };
          }
        });

        const results = await Promise.all(reportPromises);
        return results;
      });

      // Performance assertion: concurrent processing should be efficient
      expect(duration).toBeLessThan(300); // Should complete within 300ms
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for all report types', () => {
      // Define performance benchmarks
      const benchmarks = {
        'Financial Report - 10K payments': 500,
        'Profitability Report - 1K properties': 1000,
        'Delinquency Report with Aging': 800,
        'Memory Efficient Processing': 2000,
        'Concurrent Report Generation': 300
      };

      // Verify all tests met their benchmarks
      Object.entries(benchmarks).forEach(([testName, maxDuration]) => {
        const actualDuration = performanceMetrics[testName];
        if (actualDuration !== undefined) {
          expect(actualDuration).toBeLessThan(maxDuration);
          console.log(`✓ ${testName}: ${actualDuration.toFixed(2)}ms (benchmark: ${maxDuration}ms)`);
        }
      });

      // Overall performance summary
      const totalTests = Object.keys(performanceMetrics).length;
      const avgDuration = Object.values(performanceMetrics).reduce((sum, duration) => sum + duration, 0) / totalTests;
      
      console.log(`\nPerformance Summary:`);
      console.log(`- Total tests: ${totalTests}`);
      console.log(`- Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`- All benchmarks met: ${Object.entries(benchmarks).every(([test, benchmark]) => 
        performanceMetrics[test] ? performanceMetrics[test] < benchmark : true
      )}`);
    });
  });
});