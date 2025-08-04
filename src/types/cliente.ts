// Interface para Cliente
export interface Cliente {
  id?: string; // UUID do Supabase
  nome: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  endereco?: string;
  observacoes?: string;
  user_id?: string; // UUID do usuário responsável (admin/corretor)
  created_at?: string;
  updated_at?: string;
  // Relacionamento
  user?: { id: string; email: string; user_metadata?: { name?: string } }; // Dados do usuário responsável
}

// Tipo para criação de cliente (sem campos auto-gerados)
export interface CreateClienteData {
  nome: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  endereco?: string;
  observacoes?: string;
  user_id?: string; // UUID do usuário responsável
}

// Tipo para atualização de cliente (todos os campos opcionais exceto id)
export interface UpdateClienteData {
  id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  endereco?: string;
  observacoes?: string;
  user_id?: string; // UUID do usuário responsável
}

// Tipo para formulário de cliente
export interface ClienteFormData {
  nome: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  endereco: string;
  observacoes: string;
}

// Tipo para validação de cliente
export interface ClienteValidation {
  nome: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  email: {
    type: 'email';
    unique: boolean;
  };
  telefone: {
    pattern: RegExp;
  };
  cpf_cnpj: {
    pattern: RegExp;
  };
}