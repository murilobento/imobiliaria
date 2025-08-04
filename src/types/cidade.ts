// Interface para Cidade
export interface Cidade {
  id?: string; // UUID do Supabase
  nome: string;
  ativa: boolean;
  created_at?: string;
}

// Tipo para criação de cidade (sem campos auto-gerados)
export interface CreateCidadeData {
  nome: string;
  ativa?: boolean;
}

// Tipo para atualização de cidade
export interface UpdateCidadeData {
  id: string;
  nome?: string;
  ativa?: boolean;
}

// Tipo para formulário de cidade
export interface CidadeFormData {
  nome: string;
  ativa: boolean;
}

// Tipo para validação de cidade
export interface CidadeValidation {
  nome: {
    required: boolean;
    minLength: number;
    maxLength: number;
    unique: boolean;
  };
}