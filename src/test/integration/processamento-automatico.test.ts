import { describe, it, expect } from 'vitest';
import { CalculoFinanceiroService } from '@/lib/services/calculoFinanceiro';

describe('ProcessamentoAutomaticoService - Cálculos', () => {
  describe('Cálculo de juros e multa', () => {
    it('deve calcular juros e multa corretamente para pagamentos vencidos', () => {
      const valorDevido = 1000;
      const diasAtraso = 14;
      const taxaJuros = 0.01; // 1% ao mês
      const taxaMulta = 0.02; // 2%
      const diasCarencia = 5;

      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        valorDevido,
        diasAtraso,
        taxaJuros,
        taxaMulta,
        diasCarencia
      );

      // Com 14 dias de atraso e 5 dias de carência = 9 dias efetivos
      // Juros: 1000 * 0.01 * (9/30) = 3.00
      // Multa: 1000 * 0.02 = 20.00
      expect(resultado.juros).toBeCloseTo(3.00, 2);
      expect(resultado.multa).toBeCloseTo(20.00, 2);
      expect(resultado.total).toBeCloseTo(1023.00, 2);
    });

    it('não deve aplicar juros e multa dentro do período de carência', () => {
      const valorDevido = 1000;
      const diasAtraso = 3; // Dentro da carência de 5 dias
      const taxaJuros = 0.01;
      const taxaMulta = 0.02;
      const diasCarencia = 5;

      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        valorDevido,
        diasAtraso,
        taxaJuros,
        taxaMulta,
        diasCarencia
      );

      expect(resultado.juros).toBe(0);
      expect(resultado.multa).toBe(0);
      expect(resultado.total).toBe(valorDevido);
    });

    it('deve calcular juros proporcionais ao período', () => {
      const valorDevido = 1500;
      const diasAtraso = 35; // Mais de um mês
      const taxaJuros = 0.015; // 1.5% ao mês
      const taxaMulta = 0.025; // 2.5%
      const diasCarencia = 5;

      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        valorDevido,
        diasAtraso,
        taxaJuros,
        taxaMulta,
        diasCarencia
      );

      // 30 dias efetivos (35 - 5 carência)
      // Juros: 1500 * 0.015 * (30/30) = 22.50
      // Multa: 1500 * 0.025 = 37.50
      expect(resultado.juros).toBeCloseTo(22.50, 2);
      expect(resultado.multa).toBeCloseTo(37.50, 2);
      expect(resultado.total).toBeCloseTo(1560.00, 2);
    });
  });

  describe('Cálculo de rentabilidade', () => {
    it('deve calcular rentabilidade corretamente', () => {
      const receitas = [1000, 1200, 1100, 1300];
      const despesas = [200, 150, 180, 220];

      const resultado = CalculoFinanceiroService.calcularRentabilidade(receitas, despesas);

      const totalReceitas = 4600;
      const totalDespesas = 750;
      const rentabilidadeLiquida = totalReceitas - totalDespesas;
      const percentualRentabilidade = (rentabilidadeLiquida / totalReceitas) * 100;

      expect(resultado.rentabilidade_bruta).toBe(totalReceitas);
      expect(resultado.rentabilidade_liquida).toBe(rentabilidadeLiquida);
      expect(resultado.margem_percentual).toBeCloseTo(percentualRentabilidade, 2);
    });

    it('deve lidar com arrays vazios', () => {
      const resultado = CalculoFinanceiroService.calcularRentabilidade([], []);

      expect(resultado.rentabilidade_bruta).toBe(0);
      expect(resultado.rentabilidade_liquida).toBe(0);
      expect(resultado.margem_percentual).toBe(0);
    });

    it('deve calcular rentabilidade negativa', () => {
      const receitas = [500, 600];
      const despesas = [800, 900];

      const resultado = CalculoFinanceiroService.calcularRentabilidade(receitas, despesas);

      expect(resultado.rentabilidade_bruta).toBe(1100);
      expect(resultado.rentabilidade_liquida).toBe(-600); // 1100 - 1700
      expect(resultado.margem_percentual).toBeCloseTo(-54.55, 2);
    });
  });

  describe('Validação de dados', () => {
    it('deve validar valores negativos', () => {
      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(-1000, 10, 0.01, 0.02, 5);
      }).toThrow('Valor devido deve ser maior que zero');
    });

    it('deve validar dias de atraso negativos', () => {
      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(1000, -5, 0.01, 0.02, 5);
      }).toThrow('Dias de atraso não pode ser negativo');
    });

    it('deve validar taxas negativas', () => {
      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(1000, 10, -0.01, 0.02, 5);
      }).toThrow('Taxas não podem ser negativas');

      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(1000, 10, 0.01, -0.02, 5);
      }).toThrow('Taxas não podem ser negativas');
    });
  });
});