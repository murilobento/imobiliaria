import {
  ContratoAluguel,
  PagamentoAluguel,
  DespesaImovel,
  ConfiguracaoFinanceira,
  CreatePagamentoData,
  CalculoJurosMulta,
  CalculoRentabilidade,
  PAGAMENTO_STATUS
} from '@/types/financeiro';

/**
 * Serviço para cálculos financeiros do sistema de aluguéis
 */
export class CalculoFinanceiroService {
  /**
   * Calcula juros e multa para pagamentos em atraso
   * @param valorDevido Valor original devido
   * @param diasAtraso Número de dias em atraso
   * @param taxaJuros Taxa de juros mensal (ex: 0.01 = 1%)
   * @param taxaMulta Taxa de multa (ex: 0.02 = 2%)
   * @param diasCarencia Dias de carência antes de aplicar juros/multa
   * @returns Objeto com valores de juros, multa e total
   */
  static calcularJurosMulta(
    valorDevido: number,
    diasAtraso: number,
    taxaJuros: number,
    taxaMulta: number,
    diasCarencia: number = 0
  ): CalculoJurosMulta {
    // Validação de entrada
    if (valorDevido <= 0) {
      throw new Error('Valor devido deve ser maior que zero');
    }
    if (diasAtraso < 0) {
      throw new Error('Dias de atraso não pode ser negativo');
    }
    if (taxaJuros < 0 || taxaMulta < 0) {
      throw new Error('Taxas não podem ser negativas');
    }

    // Se não há atraso ou está dentro da carência, não há juros/multa
    if (diasAtraso <= diasCarencia) {
      return {
        juros: 0,
        multa: 0,
        total: valorDevido
      };
    }

    const diasAtrasoPosCarencia = diasAtraso - diasCarencia;
    
    // Cálculo da multa (aplicada uma única vez)
    const multa = valorDevido * taxaMulta;
    
    // Cálculo dos juros (proporcional aos dias de atraso)
    // Taxa mensal convertida para diária: taxa_mensal / 30
    const taxaJurosDiaria = taxaJuros / 30;
    const juros = valorDevido * taxaJurosDiaria * diasAtrasoPosCarencia;
    
    const total = valorDevido + juros + multa;

    return {
      juros: Math.round(juros * 100) / 100, // Arredonda para 2 casas decimais
      multa: Math.round(multa * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Calcula a rentabilidade de um imóvel
   * @param receitas Array com valores de receitas do período
   * @param despesas Array com valores de despesas do período
   * @returns Objeto com rentabilidade bruta, líquida e margem percentual
   */
  static calcularRentabilidade(
    receitas: number[],
    despesas: number[]
  ): CalculoRentabilidade {
    // Validação de entrada
    if (!Array.isArray(receitas) || !Array.isArray(despesas)) {
      throw new Error('Receitas e despesas devem ser arrays');
    }

    // Soma das receitas
    const receitaTotal = receitas.reduce((acc, valor) => {
      if (typeof valor !== 'number' || valor < 0) {
        throw new Error('Todos os valores de receita devem ser números não negativos');
      }
      return acc + valor;
    }, 0);

    // Soma das despesas
    const despesaTotal = despesas.reduce((acc, valor) => {
      if (typeof valor !== 'number' || valor < 0) {
        throw new Error('Todos os valores de despesa devem ser números não negativos');
      }
      return acc + valor;
    }, 0);

    // Cálculos
    const rentabilidadeBruta = receitaTotal;
    const rentabilidadeLiquida = receitaTotal - despesaTotal;
    const margemPercentual = receitaTotal > 0 
      ? (rentabilidadeLiquida / receitaTotal) * 100 
      : 0;

    return {
      rentabilidade_bruta: Math.round(rentabilidadeBruta * 100) / 100,
      rentabilidade_liquida: Math.round(rentabilidadeLiquida * 100) / 100,
      margem_percentual: Math.round(margemPercentual * 100) / 100
    };
  }

  /**
   * Gera pagamentos mensais automáticos para um contrato
   * @param contrato Contrato de aluguel
   * @returns Array com pagamentos mensais gerados
   */
  static gerarPagamentosMensais(contrato: ContratoAluguel): CreatePagamentoData[] {
    // Validação de entrada
    if (!contrato.id) {
      throw new Error('Contrato deve ter um ID válido');
    }
    if (!contrato.data_inicio || !contrato.data_fim) {
      throw new Error('Contrato deve ter datas de início e fim válidas');
    }
    if (contrato.valor_aluguel <= 0) {
      throw new Error('Valor do aluguel deve ser maior que zero');
    }
    if (contrato.dia_vencimento < 1 || contrato.dia_vencimento > 31) {
      throw new Error('Dia de vencimento deve estar entre 1 e 31');
    }

    const pagamentos: CreatePagamentoData[] = [];
    const dataInicio = new Date(contrato.data_inicio);
    const dataFim = new Date(contrato.data_fim);
    
    // Validação de datas
    if (dataInicio >= dataFim) {
      throw new Error('Data de início deve ser anterior à data de fim');
    }

    // Gerar pagamentos mês a mês
    // Usar UTC para evitar problemas de timezone
    let anoAtual = dataInicio.getUTCFullYear();
    let mesAtual = dataInicio.getUTCMonth();
    const anoFim = dataFim.getUTCFullYear();
    const mesFim = dataFim.getUTCMonth();
    
    while (anoAtual < anoFim || (anoAtual === anoFim && mesAtual <= mesFim)) {
      // Data de vencimento no dia especificado do mês
      let dataVencimento = new Date(anoAtual, mesAtual, contrato.dia_vencimento);

      // Se o dia não existe no mês (ex: 31 de fevereiro), usar o último dia do mês
      if (dataVencimento.getMonth() !== mesAtual) {
        dataVencimento = new Date(anoAtual, mesAtual + 1, 0); // Último dia do mês atual
      }

      // Data de referência do mês (primeiro dia)
      const dataReferenciaMes = new Date(anoAtual, mesAtual, 1);

      // Gerar o pagamento para este mês
      const pagamento: CreatePagamentoData = {
        contrato_id: contrato.id,
        mes_referencia: this.formatarData(dataReferenciaMes),
        valor_devido: contrato.valor_aluguel,
        data_vencimento: this.formatarData(dataVencimento),
        valor_juros: 0,
        valor_multa: 0,
        status: PAGAMENTO_STATUS.PENDENTE
      };

      pagamentos.push(pagamento);

      // Avançar para o próximo mês
      mesAtual++;
      if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
      }
    }

    return pagamentos;
  }

  /**
   * Calcula o valor total devido incluindo juros e multa
   * @param pagamento Pagamento a ser calculado
   * @param configuracao Configurações financeiras
   * @param dataReferencia Data de referência para cálculo (padrão: hoje)
   * @returns Pagamento atualizado com juros e multa
   */
  static calcularValorTotalDevido(
    pagamento: PagamentoAluguel,
    configuracao: ConfiguracaoFinanceira,
    dataReferencia: Date = new Date()
  ): PagamentoAluguel {
    // Se já foi pago, não calcular juros/multa
    if (pagamento.status === PAGAMENTO_STATUS.PAGO) {
      return pagamento;
    }

    const dataVencimento = new Date(pagamento.data_vencimento);
    const diasAtraso = Math.max(0, Math.floor(
      (dataReferencia.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const calculo = this.calcularJurosMulta(
      pagamento.valor_devido,
      diasAtraso,
      configuracao.taxa_juros_mensal,
      configuracao.taxa_multa,
      configuracao.dias_carencia
    );

    return {
      ...pagamento,
      valor_juros: calculo.juros,
      valor_multa: calculo.multa,
      status: diasAtraso > configuracao.dias_carencia 
        ? PAGAMENTO_STATUS.ATRASADO 
        : PAGAMENTO_STATUS.PENDENTE
    };
  }

  /**
   * Calcula estatísticas de rentabilidade por imóvel
   * @param imovelId ID do imóvel
   * @param pagamentos Array de pagamentos do imóvel
   * @param despesas Array de despesas do imóvel
   * @param periodoMeses Número de meses para cálculo
   * @returns Estatísticas de rentabilidade
   */
  static calcularEstatisticasRentabilidade(
    imovelId: string,
    pagamentos: PagamentoAluguel[],
    despesas: DespesaImovel[],
    periodoMeses: number = 12
  ): {
    receita_mensal_media: number;
    despesa_mensal_media: number;
    rentabilidade_mensal_media: number;
    taxa_ocupacao: number;
    roi_anual: number;
  } {
    // Filtrar pagamentos pagos
    const pagamentosPagos = pagamentos.filter(p => p.status === PAGAMENTO_STATUS.PAGO);
    
    // Calcular receita mensal média
    const receitaTotal = pagamentosPagos.reduce((acc, p) => acc + (p.valor_pago || 0), 0);
    const receitaMensalMedia = periodoMeses > 0 ? receitaTotal / periodoMeses : 0;

    // Calcular despesa mensal média
    const despesaTotal = despesas.reduce((acc, d) => acc + d.valor, 0);
    const despesaMensalMedia = periodoMeses > 0 ? despesaTotal / periodoMeses : 0;

    // Calcular rentabilidade mensal média
    const rentabilidadeMensalMedia = receitaMensalMedia - despesaMensalMedia;

    // Calcular taxa de ocupação (meses com pagamento / total de meses)
    const mesesComPagamento = new Set(
      pagamentosPagos.map(p => p.mes_referencia)
    ).size;
    const taxaOcupacao = periodoMeses > 0 ? (mesesComPagamento / periodoMeses) * 100 : 0;

    // Calcular ROI anual (assumindo valor do imóvel como 100x o aluguel mensal)
    const valorEstimadoImovel = receitaMensalMedia * 100;
    const roiAnual = valorEstimadoImovel > 0 
      ? (rentabilidadeMensalMedia * 12 / valorEstimadoImovel) * 100 
      : 0;

    return {
      receita_mensal_media: Math.round(receitaMensalMedia * 100) / 100,
      despesa_mensal_media: Math.round(despesaMensalMedia * 100) / 100,
      rentabilidade_mensal_media: Math.round(rentabilidadeMensalMedia * 100) / 100,
      taxa_ocupacao: Math.round(taxaOcupacao * 100) / 100,
      roi_anual: Math.round(roiAnual * 100) / 100
    };
  }

  /**
   * Formata data para string no formato YYYY-MM-DD
   */
  private static formatarData(data: Date): string {
    return data.toISOString().split('T')[0];
  }

  /**
   * Formata data para mês de referência (primeiro dia do mês)
   */
  private static formatarDataMesReferencia(data: Date): string {
    const primeiroDiaDoMes = new Date(data.getFullYear(), data.getMonth(), 1);
    return this.formatarData(primeiroDiaDoMes);
  }

  /**
   * Calcula diferença em dias entre duas datas
   */
  static calcularDiferencaDias(dataInicio: Date, dataFim: Date): number {
    const diffTime = dataFim.getTime() - dataInicio.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Valida se uma data está dentro do período de um contrato
   */
  static validarDataDentroContrato(data: Date, contrato: ContratoAluguel): boolean {
    const dataInicio = new Date(contrato.data_inicio);
    const dataFim = new Date(contrato.data_fim);
    return data >= dataInicio && data <= dataFim;
  }

  /**
   * Calcula o próximo vencimento baseado no dia de vencimento do contrato
   */
  static calcularProximoVencimento(contrato: ContratoAluguel, dataReferencia: Date = new Date()): Date {
    const proximoVencimento = new Date(
      dataReferencia.getFullYear(),
      dataReferencia.getMonth(),
      contrato.dia_vencimento
    );

    // Se o vencimento já passou neste mês, vai para o próximo mês
    if (proximoVencimento <= dataReferencia) {
      proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
    }

    // Ajustar se o dia não existe no mês
    if (proximoVencimento.getDate() !== contrato.dia_vencimento) {
      proximoVencimento.setDate(0); // Último dia do mês anterior
    }

    return proximoVencimento;
  }
}