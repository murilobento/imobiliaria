import {
  ContratoAluguel,
  PagamentoAluguel,
  DespesaImovel,
  ConfiguracaoFinanceira,
  CONTRATO_STATUS,
  PAGAMENTO_STATUS,
  DESPESA_STATUS,
  DESPESA_CATEGORIA,
  FINANCEIRO_CONSTANTS,
  CONTRATO_STATUS_LABELS,
  PAGAMENTO_STATUS_LABELS,
  DESPESA_STATUS_LABELS,
  DESPESA_CATEGORIA_LABELS,
  ContratoStatus,
  PagamentoStatus,
  DespesaStatus,
  DespesaCategoria
} from '../financeiro';

describe('Financeiro Types', () => {
  describe('Constants and Enums', () => {
    it('should have correct contract status values', () => {
      expect(CONTRATO_STATUS.ATIVO).toBe('ativo');
      expect(CONTRATO_STATUS.ENCERRADO).toBe('encerrado');
      expect(CONTRATO_STATUS.SUSPENSO).toBe('suspenso');
    });

    it('should have correct payment status values', () => {
      expect(PAGAMENTO_STATUS.PENDENTE).toBe('pendente');
      expect(PAGAMENTO_STATUS.PAGO).toBe('pago');
      expect(PAGAMENTO_STATUS.ATRASADO).toBe('atrasado');
      expect(PAGAMENTO_STATUS.CANCELADO).toBe('cancelado');
    });

    it('should have correct expense status values', () => {
      expect(DESPESA_STATUS.PENDENTE).toBe('pendente');
      expect(DESPESA_STATUS.PAGO).toBe('pago');
      expect(DESPESA_STATUS.CANCELADO).toBe('cancelado');
    });

    it('should have correct expense category values', () => {
      expect(DESPESA_CATEGORIA.MANUTENCAO).toBe('manutencao');
      expect(DESPESA_CATEGORIA.IMPOSTOS).toBe('impostos');
      expect(DESPESA_CATEGORIA.SEGUROS).toBe('seguros');
      expect(DESPESA_CATEGORIA.ADMINISTRACAO).toBe('administracao');
      expect(DESPESA_CATEGORIA.OUTROS).toBe('outros');
    });

    it('should have correct financial constants', () => {
      expect(FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MIN).toBe(1);
      expect(FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MAX).toBe(31);
      expect(FINANCEIRO_CONSTANTS.VALOR_MIN).toBe(0.01);
      expect(FINANCEIRO_CONSTANTS.TAXA_MIN).toBe(0);
      expect(FINANCEIRO_CONSTANTS.TAXA_MAX).toBe(1);
    });

    it('should have correct status labels', () => {
      expect(CONTRATO_STATUS_LABELS[CONTRATO_STATUS.ATIVO]).toBe('Ativo');
      expect(PAGAMENTO_STATUS_LABELS[PAGAMENTO_STATUS.PAGO]).toBe('Pago');
      expect(DESPESA_STATUS_LABELS[DESPESA_STATUS.PENDENTE]).toBe('Pendente');
      expect(DESPESA_CATEGORIA_LABELS[DESPESA_CATEGORIA.MANUTENCAO]).toBe('Manutenção');
    });
  });

  describe('Type Definitions', () => {
    it('should create valid ContratoAluguel object', () => {
      const contrato: ContratoAluguel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        imovel_id: '123e4567-e89b-12d3-a456-426614174001',
        inquilino_id: '123e4567-e89b-12d3-a456-426614174002',
        valor_aluguel: 1500.00,
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: 10,
        status: 'ativo' as ContratoStatus
      };

      expect(contrato.valor_aluguel).toBe(1500.00);
      expect(contrato.status).toBe('ativo');
      expect(contrato.dia_vencimento).toBe(10);
    });

    it('should create valid PagamentoAluguel object', () => {
      const pagamento: PagamentoAluguel = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        contrato_id: '123e4567-e89b-12d3-a456-426614174000',
        mes_referencia: '2024-01-01',
        valor_devido: 1500.00,
        data_vencimento: '2024-01-10',
        valor_juros: 0,
        valor_multa: 0,
        status: 'pendente' as PagamentoStatus
      };

      expect(pagamento.valor_devido).toBe(1500.00);
      expect(pagamento.status).toBe('pendente');
      expect(pagamento.valor_juros).toBe(0);
    });

    it('should create valid DespesaImovel object', () => {
      const despesa: DespesaImovel = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        imovel_id: '123e4567-e89b-12d3-a456-426614174001',
        categoria: 'manutencao' as DespesaCategoria,
        descricao: 'Reparo na torneira',
        valor: 150.00,
        data_despesa: '2024-01-15',
        status: 'pendente' as DespesaStatus
      };

      expect(despesa.categoria).toBe('manutencao');
      expect(despesa.valor).toBe(150.00);
      expect(despesa.status).toBe('pendente');
    });

    it('should create valid ConfiguracaoFinanceira object', () => {
      const config: ConfiguracaoFinanceira = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5
      };

      expect(config.taxa_juros_mensal).toBe(0.01);
      expect(config.taxa_multa).toBe(0.02);
      expect(config.taxa_comissao).toBe(0.10);
      expect(config.dias_carencia).toBe(5);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct status types', () => {
      // These should compile without errors
      const contratoStatus: ContratoStatus = 'ativo';
      const pagamentoStatus: PagamentoStatus = 'pago';
      const despesaStatus: DespesaStatus = 'pendente';
      const despesaCategoria: DespesaCategoria = 'manutencao';

      expect(contratoStatus).toBe('ativo');
      expect(pagamentoStatus).toBe('pago');
      expect(despesaStatus).toBe('pendente');
      expect(despesaCategoria).toBe('manutencao');
    });
  });
});

describe('Validation Rules', () => {
  it('should import validation rules correctly', async () => {
    const {
      contratoValidationRules,
      pagamentoValidationRules,
      despesaValidationRules,
      configuracaoFinanceiraValidationRules
    } = await import('../validation');

    expect(contratoValidationRules.imovel_id.required).toBe(true);
    expect(contratoValidationRules.valor_aluguel.min).toBe(0.01);
    expect(contratoValidationRules.dia_vencimento.max).toBe(31);

    expect(pagamentoValidationRules.contrato_id.required).toBe(true);
    expect(pagamentoValidationRules.valor_devido.min).toBe(0.01);

    expect(despesaValidationRules.categoria.required).toBe(true);
    expect(despesaValidationRules.categoria.enum).toContain('manutencao');

    expect(configuracaoFinanceiraValidationRules.taxa_juros_mensal.max).toBe(1);
    expect(configuracaoFinanceiraValidationRules.dias_carencia.max).toBe(30);
  });
});