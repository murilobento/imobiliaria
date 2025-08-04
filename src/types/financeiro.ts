import { Imovel } from './imovel';
import { Cliente } from './cliente';

// Enums e constantes do sistema financeiro
export const CONTRATO_STATUS = {
  ATIVO: 'ativo',
  ENCERRADO: 'encerrado',
  SUSPENSO: 'suspenso'
} as const;

export const PAGAMENTO_STATUS = {
  PENDENTE: 'pendente',
  PAGO: 'pago',
  ATRASADO: 'atrasado',
  CANCELADO: 'cancelado'
} as const;

export const DESPESA_STATUS = {
  PENDENTE: 'pendente',
  PAGO: 'pago',
  CANCELADO: 'cancelado'
} as const;

export const DESPESA_CATEGORIA = {
  MANUTENCAO: 'manutencao',
  IMPOSTOS: 'impostos',
  SEGUROS: 'seguros',
  ADMINISTRACAO: 'administracao',
  OUTROS: 'outros'
} as const;

// Tipos derivados dos enums
export type ContratoStatus = typeof CONTRATO_STATUS[keyof typeof CONTRATO_STATUS];
export type PagamentoStatus = typeof PAGAMENTO_STATUS[keyof typeof PAGAMENTO_STATUS];
export type DespesaStatus = typeof DESPESA_STATUS[keyof typeof DESPESA_STATUS];
export type DespesaCategoria = typeof DESPESA_CATEGORIA[keyof typeof DESPESA_CATEGORIA];

// Interface para Contrato de Aluguel
export interface ContratoAluguel {
  id?: string;
  imovel_id: string;
  inquilino_id: string;
  proprietario_id?: string;
  valor_aluguel: number;
  valor_deposito?: number;
  data_inicio: string;
  data_fim: string;
  dia_vencimento: number;
  status: ContratoStatus;
  observacoes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  imovel?: Imovel;
  inquilino?: Cliente;
  proprietario?: Cliente;
  pagamentos?: PagamentoAluguel[];
}

// Interface para Pagamento de Aluguel
export interface PagamentoAluguel {
  id?: string;
  contrato_id: string;
  mes_referencia: string;
  valor_devido: number;
  valor_pago?: number;
  data_vencimento: string;
  data_pagamento?: string;
  valor_juros: number;
  valor_multa: number;
  status: PagamentoStatus;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  contrato?: ContratoAluguel;
}

// Interface para Despesa de Imóvel
export interface DespesaImovel {
  id?: string;
  imovel_id: string;
  categoria: DespesaCategoria;
  descricao: string;
  valor: number;
  data_despesa: string;
  data_pagamento?: string;
  status: DespesaStatus;
  observacoes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  imovel?: Imovel;
}

// Interface para Configuração Financeira
export interface ConfiguracaoFinanceira {
  id?: string;
  taxa_juros_mensal: number;
  taxa_multa: number;
  taxa_comissao: number;
  dias_carencia: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Tipos para criação (sem campos auto-gerados)
export interface CreateContratoData {
  imovel_id: string;
  inquilino_id: string;
  proprietario_id?: string;
  valor_aluguel: number;
  valor_deposito?: number;
  data_inicio: string;
  data_fim: string;
  dia_vencimento: number;
  status?: ContratoStatus;
  observacoes?: string;
  user_id?: string;
}

export interface CreatePagamentoData {
  contrato_id: string;
  mes_referencia: string;
  valor_devido: number;
  valor_pago?: number;
  data_vencimento: string;
  data_pagamento?: string;
  valor_juros?: number;
  valor_multa?: number;
  status?: PagamentoStatus;
  observacoes?: string;
}

export interface CreateDespesaData {
  imovel_id: string;
  categoria: DespesaCategoria;
  descricao: string;
  valor: number;
  data_despesa: string;
  data_pagamento?: string;
  status?: DespesaStatus;
  observacoes?: string;
  user_id?: string;
}

export interface CreateConfiguracaoData {
  taxa_juros_mensal: number;
  taxa_multa: number;
  taxa_comissao: number;
  dias_carencia: number;
  user_id?: string;
}

// Tipos para atualização
export interface UpdateContratoData {
  id: string;
  imovel_id?: string;
  inquilino_id?: string;
  proprietario_id?: string;
  valor_aluguel?: number;
  valor_deposito?: number;
  data_inicio?: string;
  data_fim?: string;
  dia_vencimento?: number;
  status?: ContratoStatus;
  observacoes?: string;
  user_id?: string;
}

export interface UpdatePagamentoData {
  id: string;
  contrato_id?: string;
  mes_referencia?: string;
  valor_devido?: number;
  valor_pago?: number;
  data_vencimento?: string;
  data_pagamento?: string;
  valor_juros?: number;
  valor_multa?: number;
  status?: PagamentoStatus;
  observacoes?: string;
}

export interface UpdateDespesaData {
  id: string;
  imovel_id?: string;
  categoria?: DespesaCategoria;
  descricao?: string;
  valor?: number;
  data_despesa?: string;
  data_pagamento?: string;
  status?: DespesaStatus;
  observacoes?: string;
  user_id?: string;
}

export interface UpdateConfiguracaoData {
  id: string;
  taxa_juros_mensal?: number;
  taxa_multa?: number;
  taxa_comissao?: number;
  dias_carencia?: number;
  user_id?: string;
}

// Tipos para formulários
export interface ContratoFormData {
  imovel_id: string;
  inquilino_id: string;
  proprietario_id: string;
  valor_aluguel: string; // String para formulário
  valor_deposito: string; // String para formulário
  data_inicio: string;
  data_fim: string;
  dia_vencimento: number;
  status: ContratoStatus;
  observacoes: string;
}

export interface PagamentoFormData {
  contrato_id: string;
  mes_referencia: string;
  valor_devido: string; // String para formulário
  valor_pago: string; // String para formulário
  data_vencimento: string;
  data_pagamento: string;
  valor_juros: string; // String para formulário
  valor_multa: string; // String para formulário
  status: PagamentoStatus;
  observacoes: string;
}

export interface DespesaFormData {
  imovel_id: string;
  categoria: DespesaCategoria;
  descricao: string;
  valor: string; // String para formulário
  data_despesa: string;
  data_pagamento: string;
  status: DespesaStatus;
  observacoes: string;
}

export interface ConfiguracaoFormData {
  taxa_juros_mensal: string; // String para formulário
  taxa_multa: string; // String para formulário
  taxa_comissao: string; // String para formulário
  dias_carencia: number;
}

// Tipos para relatórios
export interface RelatorioFinanceiro {
  periodo: {
    inicio: string;
    fim: string;
  };
  receitas: {
    total: number;
    pagamentos_mes: number;
    pagamentos_atrasados: number;
  };
  despesas: {
    total: number;
    por_categoria: Record<DespesaCategoria, number>;
  };
  inadimplencia: {
    total_atrasado: number;
    quantidade_contratos: number;
    percentual: number;
  };
  rentabilidade: {
    bruta: number;
    liquida: number;
    margem: number;
  };
}

export interface RelatorioInadimplencia {
  contratos_atrasados: Array<{
    contrato: ContratoAluguel;
    pagamentos_pendentes: PagamentoAluguel[];
    valor_total_devido: number;
    dias_atraso: number;
  }>;
  resumo: {
    total_contratos_atrasados: number;
    valor_total_atrasado: number;
    media_dias_atraso: number;
  };
}

export interface RelatorioRentabilidade {
  por_imovel: Array<{
    imovel: Imovel;
    receita_bruta: number;
    despesas_total: number;
    receita_liquida: number;
    rentabilidade_percentual: number;
    ocupacao_percentual: number;
  }>;
  resumo: {
    receita_bruta_total: number;
    despesas_total: number;
    receita_liquida_total: number;
    rentabilidade_media: number;
    ocupacao_media: number;
  };
}

// Tipos para cálculos financeiros
export interface CalculoJurosMulta {
  juros: number;
  multa: number;
  total: number;
}

export interface CalculoRentabilidade {
  rentabilidade_bruta: number;
  rentabilidade_liquida: number;
  margem_percentual: number;
}

// Tipos para processamento de vencimentos
export interface ProcessamentoVencimento {
  pagamentos_processados: number;
  pagamentos_vencidos: number;
  notificacoes_enviadas: number;
  erros: string[];
}

// Tipos para filtros e consultas
export interface ContratoFilters {
  status?: ContratoStatus;
  imovel_id?: string;
  inquilino_id?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
}

export interface PagamentoFilters {
  status?: PagamentoStatus;
  contrato_id?: string;
  mes_referencia?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  valor_min?: number;
  valor_max?: number;
}

export interface DespesaFilters {
  status?: DespesaStatus;
  categoria?: DespesaCategoria;
  imovel_id?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
}

// Constantes para validação
export const FINANCEIRO_CONSTANTS = {
  DIA_VENCIMENTO_MIN: 1,
  DIA_VENCIMENTO_MAX: 31,
  VALOR_MIN: 0.01,
  TAXA_MIN: 0,
  TAXA_MAX: 1, // 100%
  DIAS_CARENCIA_MIN: 0,
  DIAS_CARENCIA_MAX: 30,
  DESCRICAO_MAX_LENGTH: 500,
  OBSERVACOES_MAX_LENGTH: 1000
} as const;

// Labels para exibição
export const CONTRATO_STATUS_LABELS: Record<ContratoStatus, string> = {
  [CONTRATO_STATUS.ATIVO]: 'Ativo',
  [CONTRATO_STATUS.ENCERRADO]: 'Encerrado',
  [CONTRATO_STATUS.SUSPENSO]: 'Suspenso'
};

export const PAGAMENTO_STATUS_LABELS: Record<PagamentoStatus, string> = {
  [PAGAMENTO_STATUS.PENDENTE]: 'Pendente',
  [PAGAMENTO_STATUS.PAGO]: 'Pago',
  [PAGAMENTO_STATUS.ATRASADO]: 'Atrasado',
  [PAGAMENTO_STATUS.CANCELADO]: 'Cancelado'
};

export const DESPESA_STATUS_LABELS: Record<DespesaStatus, string> = {
  [DESPESA_STATUS.PENDENTE]: 'Pendente',
  [DESPESA_STATUS.PAGO]: 'Pago',
  [DESPESA_STATUS.CANCELADO]: 'Cancelado'
};

export const DESPESA_CATEGORIA_LABELS: Record<DespesaCategoria, string> = {
  [DESPESA_CATEGORIA.MANUTENCAO]: 'Manutenção',
  [DESPESA_CATEGORIA.IMPOSTOS]: 'Impostos',
  [DESPESA_CATEGORIA.SEGUROS]: 'Seguros',
  [DESPESA_CATEGORIA.ADMINISTRACAO]: 'Administração',
  [DESPESA_CATEGORIA.OUTROS]: 'Outros'
};