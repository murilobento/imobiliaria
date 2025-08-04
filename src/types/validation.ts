// Tipos base para validação
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  type?: 'email' | 'number' | 'url' | 'tel' | 'date';
  unique?: boolean;
  enum?: string[] | number[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Regras de validação para Cliente
export const clienteValidationRules = {
  nome: {
    required: true,
    minLength: 2,
    maxLength: 255
  } as ValidationRule,
  email: {
    type: 'email' as const,
    unique: true
  } as ValidationRule,
  telefone: {
    pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/
  } as ValidationRule,
  cpf_cnpj: {
    pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/
  } as ValidationRule
};

// Regras de validação para Imóvel
export const imovelValidationRules = {
  nome: {
    required: true,
    minLength: 5,
    maxLength: 255
  } as ValidationRule,
  tipo: {
    required: true,
    enum: ['Apartamento', 'Casa', 'Terreno', 'Chácara', 'Sítio', 'Fazenda']
  } as ValidationRule,
  finalidade: {
    required: true,
    enum: ['venda', 'aluguel', 'ambos']
  } as ValidationRule,
  valor_venda: {
    type: 'number' as const,
    min: 0
  } as ValidationRule,
  valor_aluguel: {
    type: 'number' as const,
    min: 0
  } as ValidationRule,
  quartos: {
    type: 'number' as const,
    min: 0,
    max: 20
  } as ValidationRule,
  banheiros: {
    type: 'number' as const,
    min: 0,
    max: 20
  } as ValidationRule,
  area_total: {
    type: 'number' as const,
    min: 1
  } as ValidationRule
};

// Regras de validação para Cidade
export const cidadeValidationRules = {
  nome: {
    required: true,
    minLength: 2,
    maxLength: 255,
    unique: true
  } as ValidationRule
};

// Regras de validação para User Management
export const userValidationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: true
  } as ValidationRule,
  email: {
    required: true,
    type: 'email' as const,
    maxLength: 255,
    unique: true
  } as ValidationRule,
  password: {
    required: true,
    minLength: 8,
    maxLength: 128
  } as ValidationRule,
  confirmPassword: {
    required: true
  } as ValidationRule,
  currentPassword: {
    required: true
  } as ValidationRule,
  newPassword: {
    required: true,
    minLength: 8,
    maxLength: 128
  } as ValidationRule
};

// Regras de validação para Contratos de Aluguel
export const contratoValidationRules = {
  imovel_id: {
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  } as ValidationRule,
  inquilino_id: {
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  } as ValidationRule,
  valor_aluguel: {
    required: true,
    type: 'number' as const,
    min: 0.01
  } as ValidationRule,
  valor_deposito: {
    type: 'number' as const,
    min: 0
  } as ValidationRule,
  data_inicio: {
    required: true,
    type: 'date' as const
  } as ValidationRule,
  data_fim: {
    required: true,
    type: 'date' as const
  } as ValidationRule,
  dia_vencimento: {
    required: true,
    type: 'number' as const,
    min: 1,
    max: 31
  } as ValidationRule,
  status: {
    required: true,
    enum: ['ativo', 'encerrado', 'suspenso']
  } as ValidationRule,
  observacoes: {
    maxLength: 1000
  } as ValidationRule
};

// Regras de validação para Pagamentos de Aluguel
export const pagamentoValidationRules = {
  contrato_id: {
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  } as ValidationRule,
  mes_referencia: {
    required: true,
    type: 'date' as const
  } as ValidationRule,
  valor_devido: {
    required: true,
    type: 'number' as const,
    min: 0.01
  } as ValidationRule,
  valor_pago: {
    type: 'number' as const,
    min: 0
  } as ValidationRule,
  data_vencimento: {
    required: true,
    type: 'date' as const
  } as ValidationRule,
  data_pagamento: {
    type: 'date' as const
  } as ValidationRule,
  valor_juros: {
    type: 'number' as const,
    min: 0
  } as ValidationRule,
  valor_multa: {
    type: 'number' as const,
    min: 0
  } as ValidationRule,
  status: {
    required: true,
    enum: ['pendente', 'pago', 'atrasado', 'cancelado']
  } as ValidationRule,
  observacoes: {
    maxLength: 1000
  } as ValidationRule
};

// Regras de validação para Despesas de Imóveis
export const despesaValidationRules = {
  imovel_id: {
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  } as ValidationRule,
  categoria: {
    required: true,
    enum: ['manutencao', 'impostos', 'seguros', 'administracao', 'outros']
  } as ValidationRule,
  descricao: {
    required: true,
    minLength: 3,
    maxLength: 500
  } as ValidationRule,
  valor: {
    required: true,
    type: 'number' as const,
    min: 0.01
  } as ValidationRule,
  data_despesa: {
    required: true,
    type: 'date' as const
  } as ValidationRule,
  data_pagamento: {
    type: 'date' as const
  } as ValidationRule,
  status: {
    required: true,
    enum: ['pendente', 'pago', 'cancelado']
  } as ValidationRule,
  observacoes: {
    maxLength: 1000
  } as ValidationRule
};

// Regras de validação para Configurações Financeiras
export const configuracaoFinanceiraValidationRules = {
  taxa_juros_mensal: {
    required: true,
    type: 'number' as const,
    min: 0,
    max: 1
  } as ValidationRule,
  taxa_multa: {
    required: true,
    type: 'number' as const,
    min: 0,
    max: 1
  } as ValidationRule,
  taxa_comissao: {
    required: true,
    type: 'number' as const,
    min: 0,
    max: 1
  } as ValidationRule,
  dias_carencia: {
    required: true,
    type: 'number' as const,
    min: 0,
    max: 30
  } as ValidationRule
};

// Regras de validação para atualização de perfil
export const profileUpdateValidationRules = {
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 255
  } as ValidationRule,
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: true
  } as ValidationRule,
  email: {
    type: 'email' as const,
    maxLength: 255,
    unique: true
  } as ValidationRule
};

// Tipos para formulários com validação
export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  valid: boolean;
}

export interface FormState<T> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Mensagens de erro padrão
export const validationMessages = {
  required: 'Este campo é obrigatório',
  minLength: (min: number) => `Deve ter pelo menos ${min} caracteres`,
  maxLength: (max: number) => `Deve ter no máximo ${max} caracteres`,
  min: (min: number) => `Valor mínimo é ${min}`,
  max: (max: number) => `Valor máximo é ${max}`,
  email: 'Email inválido',
  pattern: 'Formato inválido',
  unique: 'Este valor já está em uso',
  enum: (values: string[]) => `Deve ser um dos valores: ${values.join(', ')}`
};

// Tipos para validação de imagens
export interface ImageValidationRules {
  maxSize: number; // em bytes
  allowedTypes: string[];
  maxFiles: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const imageValidationRules: ImageValidationRules = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxFiles: 10,
  minWidth: 300,
  minHeight: 200,
  maxWidth: 4000,
  maxHeight: 3000
};