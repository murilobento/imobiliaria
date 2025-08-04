import { describe, it, expect, beforeEach } from 'vitest';
import { CalculoFinanceiroService } from '../calculoFinanceiro';
import {
  ContratoAluguel,
  PagamentoAluguel,
  DespesaImovel,
  ConfiguracaoFinanceira,
  CONTRATO_STATUS,
  PAGAMENTO_STATUS,
  DESPESA_CATEGORIA
} from '@/types/financeiro';

describe('CalculoFinanceiroService', () => {
  let mockContrato: ContratoAluguel;
  let mockConfiguracao: ConfiguracaoFinanceira;
  let mockPagamento: PagamentoAluguel;

  beforeEach(() => {
    mockContrato = {
      id: 'contrato-123',
      imovel_id: 'imovel-123',
      inquilino_id: 'cliente-123',
      valor_aluguel: 1000,
      data_inicio: '2024-01-01',
      data_fim: '2024-12-31',
      dia_vencimento: 10,
      status: CONTRATO_STATUS.ATIVO
    };

    mockConfiguracao = {
      id: 'config-123',
      taxa_juros_mensal: 0.01, // 1% ao mês
      taxa_multa: 0.02, // 2%
      taxa_comissao: 0.10, // 10%
      dias_carencia: 5
    };

    mockPagamento = {
      id: 'pagamento-123',
      contrato_id: 'contrato-123',
      mes_referencia: '2024-01-01',
      valor_devido: 1000,
      data_vencimento: '2024-01-10',
      valor_juros: 0,
      valor_multa: 0,
      status: PAGAMENTO_STATUS.PENDENTE
    };
  });

  describe('calcularJurosMulta', () => {
    it('deve calcular juros e multa corretamente para pagamento em atraso', () => {
      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        1000, // valor devido
        15,   // dias de atraso
        0.01, // taxa juros mensal (1%)
        0.02, // taxa multa (2%)
        5     // dias carência
      );

      // Multa: 1000 * 0.02 = 20
      // Juros: 1000 * (0.01/30) * (15-5) = 1000 * 0.000333 * 10 = 3.33
      // Total: 1000 + 20 + 3.33 = 1023.33
      expect(resultado.multa).toBe(20);
      expect(resultado.juros).toBe(3.33);
      expect(resultado.total).toBe(1023.33);
    });

    it('deve retornar zero para juros e multa quando não há atraso', () => {
      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        1000, // valor devido
        0,    // dias de atraso
        0.01, // taxa juros mensal
        0.02, // taxa multa
        5     // dias carência
      );

      expect(resultado.juros).toBe(0);
      expect(resultado.multa).toBe(0);
      expect(resultado.total).toBe(1000);
    });

    it('deve retornar zero para juros e multa quando está dentro da carência', () => {
      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        1000, // valor devido
        3,    // dias de atraso (menor que carência)
        0.01, // taxa juros mensal
        0.02, // taxa multa
        5     // dias carência
      );

      expect(resultado.juros).toBe(0);
      expect(resultado.multa).toBe(0);
      expect(resultado.total).toBe(1000);
    });

    it('deve lançar erro para valor devido inválido', () => {
      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(0, 10, 0.01, 0.02);
      }).toThrow('Valor devido deve ser maior que zero');

      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(-100, 10, 0.01, 0.02);
      }).toThrow('Valor devido deve ser maior que zero');
    });

    it('deve lançar erro para dias de atraso negativo', () => {
      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(1000, -5, 0.01, 0.02);
      }).toThrow('Dias de atraso não pode ser negativo');
    });

    it('deve lançar erro para taxas negativas', () => {
      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(1000, 10, -0.01, 0.02);
      }).toThrow('Taxas não podem ser negativas');

      expect(() => {
        CalculoFinanceiroService.calcularJurosMulta(1000, 10, 0.01, -0.02);
      }).toThrow('Taxas não podem ser negativas');
    });

    it('deve calcular corretamente com taxas zero', () => {
      const resultado = CalculoFinanceiroService.calcularJurosMulta(
        1000, // valor devido
        10,   // dias de atraso
        0,    // taxa juros zero
        0,    // taxa multa zero
        0     // sem carência
      );

      expect(resultado.juros).toBe(0);
      expect(resultado.multa).toBe(0);
      expect(resultado.total).toBe(1000);
    });
  });

  describe('calcularRentabilidade', () => {
    it('deve calcular rentabilidade corretamente com receitas e despesas', () => {
      const receitas = [1000, 1000, 1000]; // 3000 total
      const despesas = [200, 150, 100];    // 450 total

      const resultado = CalculoFinanceiroService.calcularRentabilidade(receitas, despesas);

      expect(resultado.rentabilidade_bruta).toBe(3000);
      expect(resultado.rentabilidade_liquida).toBe(2550);
      expect(resultado.margem_percentual).toBe(85); // (2550/3000) * 100
    });

    it('deve calcular rentabilidade com arrays vazios', () => {
      const resultado = CalculoFinanceiroService.calcularRentabilidade([], []);

      expect(resultado.rentabilidade_bruta).toBe(0);
      expect(resultado.rentabilidade_liquida).toBe(0);
      expect(resultado.margem_percentual).toBe(0);
    });

    it('deve calcular rentabilidade negativa quando despesas > receitas', () => {
      const receitas = [500];
      const despesas = [800];

      const resultado = CalculoFinanceiroService.calcularRentabilidade(receitas, despesas);

      expect(resultado.rentabilidade_bruta).toBe(500);
      expect(resultado.rentabilidade_liquida).toBe(-300);
      expect(resultado.margem_percentual).toBe(-60); // (-300/500) * 100
    });

    it('deve lançar erro para parâmetros inválidos', () => {
      expect(() => {
        CalculoFinanceiroService.calcularRentabilidade('invalid' as any, []);
      }).toThrow('Receitas e despesas devem ser arrays');

      expect(() => {
        CalculoFinanceiroService.calcularRentabilidade([], 'invalid' as any);
      }).toThrow('Receitas e despesas devem ser arrays');
    });

    it('deve lançar erro para valores negativos', () => {
      expect(() => {
        CalculoFinanceiroService.calcularRentabilidade([1000, -500], [200]);
      }).toThrow('Todos os valores de receita devem ser números não negativos');

      expect(() => {
        CalculoFinanceiroService.calcularRentabilidade([1000], [200, -100]);
      }).toThrow('Todos os valores de despesa devem ser números não negativos');
    });

    it('deve lançar erro para valores não numéricos', () => {
      expect(() => {
        CalculoFinanceiroService.calcularRentabilidade([1000, 'invalid' as any], [200]);
      }).toThrow('Todos os valores de receita devem ser números não negativos');

      expect(() => {
        CalculoFinanceiroService.calcularRentabilidade([1000], [200, 'invalid' as any]);
      }).toThrow('Todos os valores de despesa devem ser números não negativos');
    });
  });

  describe('gerarPagamentosMensais', () => {
    it('deve gerar pagamentos mensais corretamente para um ano', () => {
      const pagamentos = CalculoFinanceiroService.gerarPagamentosMensais(mockContrato);

      expect(pagamentos).toHaveLength(12); // 12 meses
      
      // Verificar primeiro pagamento
      expect(pagamentos[0]).toEqual({
        contrato_id: 'contrato-123',
        mes_referencia: '2024-01-01',
        valor_devido: 1000,
        data_vencimento: '2024-01-10',
        valor_juros: 0,
        valor_multa: 0,
        status: PAGAMENTO_STATUS.PENDENTE
      });

      // Verificar último pagamento
      expect(pagamentos[11]).toEqual({
        contrato_id: 'contrato-123',
        mes_referencia: '2024-12-01',
        valor_devido: 1000,
        data_vencimento: '2024-12-10',
        valor_juros: 0,
        valor_multa: 0,
        status: PAGAMENTO_STATUS.PENDENTE
      });
    });

    it('deve gerar pagamentos para período parcial', () => {
      const contratoTrimestral = {
        ...mockContrato,
        data_inicio: '2024-01-15',
        data_fim: '2024-03-31'
      };

      const pagamentos = CalculoFinanceiroService.gerarPagamentosMensais(contratoTrimestral);

      expect(pagamentos).toHaveLength(3); // Janeiro, Fevereiro, Março
      expect(pagamentos[0].mes_referencia).toBe('2024-01-01');
      expect(pagamentos[1].mes_referencia).toBe('2024-02-01');
      expect(pagamentos[2].mes_referencia).toBe('2024-03-01');
    });

    it('deve ajustar dia de vencimento para meses com menos dias', () => {
      const contratoComDia31 = {
        ...mockContrato,
        dia_vencimento: 31,
        data_inicio: '2024-01-01',
        data_fim: '2024-02-29' // Ano bissexto
      };

      const pagamentos = CalculoFinanceiroService.gerarPagamentosMensais(contratoComDia31);

      expect(pagamentos).toHaveLength(2);
      expect(pagamentos[0].data_vencimento).toBe('2024-01-31'); // Janeiro tem 31 dias
      expect(pagamentos[1].data_vencimento).toBe('2024-02-29'); // Fevereiro ajustado para último dia
    });

    it('deve lançar erro para contrato sem ID', () => {
      const contratoSemId = { ...mockContrato, id: undefined };

      expect(() => {
        CalculoFinanceiroService.gerarPagamentosMensais(contratoSemId);
      }).toThrow('Contrato deve ter um ID válido');
    });

    it('deve lançar erro para datas inválidas', () => {
      const contratoDataInvalida = {
        ...mockContrato,
        data_inicio: '',
        data_fim: '2024-12-31'
      };

      expect(() => {
        CalculoFinanceiroService.gerarPagamentosMensais(contratoDataInvalida);
      }).toThrow('Contrato deve ter datas de início e fim válidas');
    });

    it('deve lançar erro para valor de aluguel inválido', () => {
      const contratoValorInvalido = {
        ...mockContrato,
        valor_aluguel: 0
      };

      expect(() => {
        CalculoFinanceiroService.gerarPagamentosMensais(contratoValorInvalido);
      }).toThrow('Valor do aluguel deve ser maior que zero');
    });

    it('deve lançar erro para dia de vencimento inválido', () => {
      const contratoDiaInvalido = {
        ...mockContrato,
        dia_vencimento: 0
      };

      expect(() => {
        CalculoFinanceiroService.gerarPagamentosMensais(contratoDiaInvalido);
      }).toThrow('Dia de vencimento deve estar entre 1 e 31');
    });

    it('deve lançar erro quando data início >= data fim', () => {
      const contratoDataInvertida = {
        ...mockContrato,
        data_inicio: '2024-12-31',
        data_fim: '2024-01-01'
      };

      expect(() => {
        CalculoFinanceiroService.gerarPagamentosMensais(contratoDataInvertida);
      }).toThrow('Data de início deve ser anterior à data de fim');
    });
  });

  describe('calcularValorTotalDevido', () => {
    it('deve calcular valor total com juros e multa para pagamento em atraso', () => {
      const dataReferencia = new Date('2024-01-25'); // 15 dias após vencimento
      
      const resultado = CalculoFinanceiroService.calcularValorTotalDevido(
        mockPagamento,
        mockConfiguracao,
        dataReferencia
      );

      expect(resultado.status).toBe(PAGAMENTO_STATUS.ATRASADO);
      expect(resultado.valor_multa).toBe(20); // 1000 * 0.02
      expect(resultado.valor_juros).toBe(3.33); // 1000 * (0.01/30) * 10 dias após carência
    });

    it('deve manter status pendente dentro da carência', () => {
      const dataReferencia = new Date('2024-01-13'); // 3 dias após vencimento (dentro da carência)
      
      const resultado = CalculoFinanceiroService.calcularValorTotalDevido(
        mockPagamento,
        mockConfiguracao,
        dataReferencia
      );

      expect(resultado.status).toBe(PAGAMENTO_STATUS.PENDENTE);
      expect(resultado.valor_multa).toBe(0);
      expect(resultado.valor_juros).toBe(0);
    });

    it('deve manter pagamento pago inalterado', () => {
      const pagamentoPago = {
        ...mockPagamento,
        status: PAGAMENTO_STATUS.PAGO,
        valor_pago: 1000
      };

      const resultado = CalculoFinanceiroService.calcularValorTotalDevido(
        pagamentoPago,
        mockConfiguracao,
        new Date('2024-01-25')
      );

      expect(resultado.status).toBe(PAGAMENTO_STATUS.PAGO);
      expect(resultado.valor_multa).toBe(0);
      expect(resultado.valor_juros).toBe(0);
    });
  });

  describe('calcularEstatisticasRentabilidade', () => {
    it('deve calcular estatísticas de rentabilidade corretamente', () => {
      const pagamentos: PagamentoAluguel[] = [
        { ...mockPagamento, status: PAGAMENTO_STATUS.PAGO, valor_pago: 1000, mes_referencia: '2024-01-01' },
        { ...mockPagamento, status: PAGAMENTO_STATUS.PAGO, valor_pago: 1000, mes_referencia: '2024-02-01' },
        { ...mockPagamento, status: PAGAMENTO_STATUS.PAGO, valor_pago: 1000, mes_referencia: '2024-03-01' }
      ];

      const despesas: DespesaImovel[] = [
        {
          id: 'despesa-1',
          imovel_id: 'imovel-123',
          categoria: DESPESA_CATEGORIA.MANUTENCAO,
          descricao: 'Reparo',
          valor: 200,
          data_despesa: '2024-01-15',
          status: 'pago'
        },
        {
          id: 'despesa-2',
          imovel_id: 'imovel-123',
          categoria: DESPESA_CATEGORIA.IMPOSTOS,
          descricao: 'IPTU',
          valor: 100,
          data_despesa: '2024-02-15',
          status: 'pago'
        }
      ];

      const resultado = CalculoFinanceiroService.calcularEstatisticasRentabilidade(
        'imovel-123',
        pagamentos,
        despesas,
        12
      );

      expect(resultado.receita_mensal_media).toBe(250); // 3000 / 12
      expect(resultado.despesa_mensal_media).toBe(25); // 300 / 12
      expect(resultado.rentabilidade_mensal_media).toBe(225); // 250 - 25
      expect(resultado.taxa_ocupacao).toBe(25); // 3 meses com pagamento / 12 meses * 100
      expect(resultado.roi_anual).toBe(10.8); // (225 * 12 / (250 * 100)) * 100
    });

    it('deve retornar zeros para arrays vazios', () => {
      const resultado = CalculoFinanceiroService.calcularEstatisticasRentabilidade(
        'imovel-123',
        [],
        [],
        12
      );

      expect(resultado.receita_mensal_media).toBe(0);
      expect(resultado.despesa_mensal_media).toBe(0);
      expect(resultado.rentabilidade_mensal_media).toBe(0);
      expect(resultado.taxa_ocupacao).toBe(0);
      expect(resultado.roi_anual).toBe(0);
    });
  });

  describe('métodos utilitários', () => {
    it('deve calcular diferença em dias corretamente', () => {
      const dataInicio = new Date('2024-01-01');
      const dataFim = new Date('2024-01-10');

      const diferenca = CalculoFinanceiroService.calcularDiferencaDias(dataInicio, dataFim);
      expect(diferenca).toBe(9);
    });

    it('deve validar data dentro do contrato', () => {
      const dataValida = new Date('2024-06-15');
      const dataInvalida = new Date('2025-01-01');

      expect(CalculoFinanceiroService.validarDataDentroContrato(dataValida, mockContrato)).toBe(true);
      expect(CalculoFinanceiroService.validarDataDentroContrato(dataInvalida, mockContrato)).toBe(false);
    });

    it('deve calcular próximo vencimento corretamente', () => {
      const dataReferencia = new Date('2024-01-05'); // Antes do vencimento
      const proximoVencimento = CalculoFinanceiroService.calcularProximoVencimento(
        mockContrato,
        dataReferencia
      );

      expect(proximoVencimento.getDate()).toBe(10);
      expect(proximoVencimento.getMonth()).toBe(0); // Janeiro (0-indexed)
      expect(proximoVencimento.getFullYear()).toBe(2024);
    });

    it('deve calcular próximo vencimento para mês seguinte quando já passou', () => {
      const dataReferencia = new Date('2024-01-15'); // Depois do vencimento
      const proximoVencimento = CalculoFinanceiroService.calcularProximoVencimento(
        mockContrato,
        dataReferencia
      );

      expect(proximoVencimento.getDate()).toBe(10);
      expect(proximoVencimento.getMonth()).toBe(1); // Fevereiro (0-indexed)
      expect(proximoVencimento.getFullYear()).toBe(2024);
    });
  });
});