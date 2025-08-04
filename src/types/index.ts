// Export all types from individual files
export * from './cliente';
export * from './cidade';
export * from './imovel';
export * from './financeiro';
export * from './api';
export * from './validation';

// Re-export commonly used types for convenience
export type {
  Cliente,
  CreateClienteData,
  UpdateClienteData,
  ClienteFormData
} from './cliente';

export type {
  Cidade,
  CreateCidadeData,
  UpdateCidadeData,
  CidadeFormData
} from './cidade';

export type {
  Imovel,
  ImovelImagem,
  ImovelTipo,
  ImovelFinalidade,
  ImagemTipo,
  CreateImovelData,
  UpdateImovelData,
  ImovelFormData
} from './imovel';

export type {
  ContratoAluguel,
  PagamentoAluguel,
  DespesaImovel,
  ConfiguracaoFinanceira,
  CreateContratoData,
  CreatePagamentoData,
  CreateDespesaData,
  CreateConfiguracaoData,
  UpdateContratoData,
  UpdatePagamentoData,
  UpdateDespesaData,
  UpdateConfiguracaoData,
  ContratoFormData,
  PagamentoFormData,
  DespesaFormData,
  ConfiguracaoFormData,
  ContratoStatus,
  PagamentoStatus,
  DespesaStatus,
  DespesaCategoria,
  RelatorioFinanceiro,
  RelatorioInadimplencia,
  RelatorioRentabilidade,
  CalculoJurosMulta,
  CalculoRentabilidade,
  ProcessamentoVencimento,
  ContratoFilters,
  PagamentoFilters,
  DespesaFilters
} from './financeiro';

export type {
  ApiResponse,
  ApiError,
  ErrorType,
  PaginationParams,
  PaginatedResponse,
  ImageUploadResponse,
  MultipleImageUploadResponse
} from './api';

export type {
  ValidationRule,
  ValidationError,
  ValidationResult,
  FormField,
  FormState,
  ImageValidationRules
} from './validation';

export {
  clienteValidationRules,
  imovelValidationRules,
  cidadeValidationRules,
  contratoValidationRules,
  pagamentoValidationRules,
  despesaValidationRules,
  configuracaoFinanceiraValidationRules,
  validationMessages,
  imageValidationRules
} from './validation';

export {
  CONTRATO_STATUS,
  PAGAMENTO_STATUS,
  DESPESA_STATUS,
  DESPESA_CATEGORIA,
  FINANCEIRO_CONSTANTS,
  CONTRATO_STATUS_LABELS,
  PAGAMENTO_STATUS_LABELS,
  DESPESA_STATUS_LABELS,
  DESPESA_CATEGORIA_LABELS
} from './financeiro';