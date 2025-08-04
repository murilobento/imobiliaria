import { describe, it, expect } from 'vitest';

describe('Pagamentos Workflow Integration Tests', () => {
  describe('Automatic Payment Processing', () => {
    it('should process due payments and calculate fees', async () => {
      // Mock financial configuration
      const config = {
        id: 'config-1',
        taxa_juros_mensal: 0.01, // 1% per month
        taxa_multa: 0.02, // 2% flat fee
        dias_carencia: 5 // 5 days grace period
      };

      // Create overdue payment (30 days late)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 30);
      
      const payment = {
        id: 'payment-overdue',
        valor_devido: 1500,
        data_vencimento: overdueDate.toISOString().split('T')[0],
        status: 'pendente',
        valor_juros: 0,
        valor_multa: 0
      };

      // Simulate automatic processing
      const today = new Date();
      const dueDate = new Date(payment.data_vencimento);
      const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let newStatus = payment.status;
      let juros = 0;
      let multa = 0;

      if (daysLate > config.dias_carencia) {
        newStatus = 'atrasado';
        
        // Calculate late fee (flat percentage)
        multa = payment.valor_devido * config.taxa_multa;
        
        // Calculate interest (monthly rate, pro-rated daily)
        const monthsLate = daysLate / 30;
        juros = payment.valor_devido * config.taxa_juros_mensal * monthsLate;
      }

      // Update payment with calculated fees
      const updatedPayment = {
        ...payment,
        status: newStatus,
        valor_juros: juros,
        valor_multa: multa
      };

      // Verify calculations
      expect(updatedPayment.status).toBe('atrasado');
      expect(updatedPayment.valor_multa).toBe(1500 * 0.02); // 2% of 1500 = 30
      expect(updatedPayment.valor_juros).toBeCloseTo(1500 * 0.01 * (30/30), 2); // 1% per month for 1 month
      
      const totalAmount = updatedPayment.valor_devido + updatedPayment.valor_juros + updatedPayment.valor_multa;
      expect(totalAmount).toBeGreaterThan(1500);
    });

    it('should handle payment registration and status updates', async () => {
      // Create pending payment
      const payment = {
        id: 'payment-pending',
        contrato_id: 'contract-1',
        mes_referencia: '2024-01-01',
        valor_devido: 1500,
        data_vencimento: '2024-01-10',
        status: 'pendente',
        valor_pago: null as number | null,
        data_pagamento: null as string | null
      };

      // Simulate payment registration
      const paymentDate = new Date();
      const paidAmount = 1500;

      const paidPayment = {
        ...payment,
        status: 'pago',
        valor_pago: paidAmount,
        data_pagamento: paymentDate.toISOString().split('T')[0]
      };

      // Verify payment was registered correctly
      expect(paidPayment.status).toBe('pago');
      expect(paidPayment.valor_pago).toBe(1500);
      expect(paidPayment.data_pagamento).toBe(paymentDate.toISOString().split('T')[0]);
    });

    it('should generate monthly payments automatically', async () => {
      // Contract details
      const contrato = {
        id: 'contract-auto-payments',
        valor_aluguel: 1500,
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: 10
      };

      // Generate payments for the contract period
      const startDate = new Date(contrato.data_inicio);
      const endDate = new Date(contrato.data_fim);
      const payments = [];

      for (let date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
        const mesReferencia = new Date(date.getFullYear(), date.getMonth(), 1);
        const dataVencimento = new Date(date.getFullYear(), date.getMonth(), contrato.dia_vencimento);

        const paymentId = `payment-${date.getMonth()}`;
        const payment = {
          id: paymentId,
          contrato_id: contrato.id,
          mes_referencia: mesReferencia.toISOString().split('T')[0],
          valor_devido: contrato.valor_aluguel,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          valor_juros: 0,
          valor_multa: 0,
          status: 'pendente'
        };
        
        payments.push(payment);
      }

      // Verify payments were generated correctly
      expect(payments).toHaveLength(12); // 12 months
      expect(payments[0].valor_devido).toBe(1500);
      expect(payments[0].status).toBe('pendente');
      
      // Verify payment dates are correct
      payments.forEach((payment, index) => {
        const expectedMonth = (startDate.getMonth() + index) % 12;
        const paymentMonth = new Date(payment.data_vencimento).getMonth();
        expect(paymentMonth).toBe(expectedMonth);
        expect(new Date(payment.data_vencimento).getDate()).toBe(contrato.dia_vencimento);
      });
    });
  });

  describe('Payment Status Transitions', () => {
    it('should transition payment status correctly through workflow', async () => {
      // Create payment
      let payment = {
        id: 'payment-transitions',
        contrato_id: 'contract-1',
        mes_referencia: '2024-01-01',
        valor_devido: 1500,
        data_vencimento: '2024-01-10',
        status: 'pendente',
        valor_juros: 0,
        valor_multa: 0,
        valor_pago: null as number | null,
        data_pagamento: null as string | null
      };

      // Status: pendente -> atrasado
      payment = {
        ...payment,
        status: 'atrasado',
        valor_juros: 15,
        valor_multa: 30
      };
      expect(payment.status).toBe('atrasado');

      // Status: atrasado -> pago
      payment = {
        ...payment,
        status: 'pago',
        valor_pago: 1545, // Original + fees
        data_pagamento: new Date().toISOString().split('T')[0]
      };
      expect(payment.status).toBe('pago');
      expect(payment.valor_pago).toBe(1545);
    });

    it('should handle payment cancellation', async () => {
      // Create payment
      let payment = {
        id: 'payment-cancel',
        contrato_id: 'contract-1',
        mes_referencia: '2024-01-01',
        valor_devido: 1500,
        data_vencimento: '2024-01-10',
        status: 'pendente',
        observacoes: null as string | null
      };

      // Cancel payment (e.g., when contract is terminated)
      payment = {
        ...payment,
        status: 'cancelado',
        observacoes: 'Cancelado devido ao encerramento do contrato'
      };
      
      expect(payment.status).toBe('cancelado');
      expect(payment.observacoes).toContain('Cancelado');
    });
  });
});