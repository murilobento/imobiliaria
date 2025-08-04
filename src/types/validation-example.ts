// Example usage of all types to verify they work correctly
// This file demonstrates that all interfaces and types are properly defined

import {
  Cliente,
  CreateClienteData,
  UpdateClienteData,
  ClienteFormData,
  Cidade,
  CreateCidadeData,
  UpdateCidadeData,
  CidadeFormData,
  Imovel,
  ImovelImagem,
  ImovelTipo,
  ImovelFinalidade,
  CreateImovelData,
  UpdateImovelData,
  ImovelFormData,
  ApiResponse,
  PaginatedResponse,
  ValidationRule,
  ValidationError,
  clienteValidationRules,
  imovelValidationRules,
  cidadeValidationRules,
  validationMessages,
  imageValidationRules
} from './index';

// Example Cliente usage
const exampleCliente: Cliente = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nome: 'João Silva',
  email: 'joao@email.com',
  telefone: '(11) 99999-9999',
  cpf_cnpj: '123.456.789-00',
  endereco: 'Rua A, 123, Centro',
  observacoes: 'Cliente VIP',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const createClienteData: CreateClienteData = {
  nome: 'Maria Santos',
  email: 'maria@email.com',
  telefone: '(11) 88888-8888'
};

const updateClienteData: UpdateClienteData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nome: 'João Silva Atualizado',
  email: 'joao.novo@email.com'
};

const clienteFormData: ClienteFormData = {
  nome: 'Pedro Costa',
  email: 'pedro@email.com',
  telefone: '(11) 77777-7777',
  cpf_cnpj: '987.654.321-00',
  endereco: 'Rua B, 456',
  observacoes: 'Novo cliente'
};

// Example Cidade usage
const exampleCidade: Cidade = {
  id: '456e7890-e89b-12d3-a456-426614174001',
  nome: 'São Paulo',
  ativa: true,
  created_at: '2024-01-01T00:00:00Z'
};

const createCidadeData: CreateCidadeData = {
  nome: 'Rio de Janeiro',
  ativa: true
};

const updateCidadeData: UpdateCidadeData = {
  id: '456e7890-e89b-12d3-a456-426614174001',
  nome: 'São Paulo - SP'
};

const cidadeFormData: CidadeFormData = {
  nome: 'Belo Horizonte',
  ativa: true
};

// Example Imovel usage
const imovelTipo: ImovelTipo = 'Apartamento';
const finalidade: ImovelFinalidade = 'venda';

const exampleImagem: ImovelImagem = {
  id: '789e0123-e89b-12d3-a456-426614174002',
  imovel_id: '101e2345-e89b-12d3-a456-426614174003',
  url: 'https://example.com/image.jpg',
  url_thumb: 'https://example.com/thumb.jpg',
  storage_path: 'imoveis/101e2345/image.jpg',
  ordem: 1,
  tipo: 'paisagem',
  created_at: '2024-01-01T00:00:00Z'
};

const exampleImovel: Imovel = {
  id: '101e2345-e89b-12d3-a456-426614174003',
  nome: 'Apartamento Luxo no Centro',
  tipo: imovelTipo,
  finalidade: finalidade,
  valor_venda: 500000,
  valor_aluguel: 2500,
  descricao: 'Apartamento moderno com vista para o mar',
  quartos: 3,
  banheiros: 2,
  area_total: 120.5,
  caracteristicas: ['Sacada', 'Garagem', 'Elevador'],
  comodidades: ['Piscina', 'Academia', 'Portaria 24h'],
  endereco_completo: 'Rua das Flores, 123, Centro',
  cidade_id: '456e7890-e89b-12d3-a456-426614174001',
  bairro: 'Centro',
  destaque: true,
  cliente_id: '123e4567-e89b-12d3-a456-426614174000',
  ativo: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  imagens: [exampleImagem],
  cidade: exampleCidade,
  cliente: exampleCliente
};

const createImovelData: CreateImovelData = {
  nome: 'Casa Nova no Jardim',
  tipo: 'Casa',
  finalidade: 'aluguel',
  valor_aluguel: 2500,
  quartos: 2,
  banheiros: 1,
  area_total: 80,
  caracteristicas: ['Quintal', 'Garagem'],
  comodidades: ['Portaria'],
  endereco_completo: 'Rua dos Jardins, 456',
  cidade_id: '456e7890-e89b-12d3-a456-426614174001',
  bairro: 'Jardim',
  destaque: false,
  cliente_id: '123e4567-e89b-12d3-a456-426614174000',
  ativo: true
};

const updateImovelData: UpdateImovelData = {
  id: '101e2345-e89b-12d3-a456-426614174003',
  nome: 'Apartamento Luxo Atualizado',
  valor_venda: 550000
};

const imovelFormData: ImovelFormData = {
  nome: 'Terreno Central',
  tipo: 'Terreno',
  finalidade: 'venda',
  valor_venda: '150000',
  valor_aluguel: '',
  descricao: 'Terreno bem localizado no centro da cidade',
  quartos: 0,
  banheiros: 0,
  area_total: '500',
  caracteristicas: ['Plano', 'Esquina'],
  comodidades: [],
  endereco_completo: 'Rua Central, 100',
  cidade_id: '456e7890-e89b-12d3-a456-426614174001',
  bairro: 'Centro',
  destaque: false,
  cliente_id: '123e4567-e89b-12d3-a456-426614174000',
  ativo: true
};

// Example API Response usage
const successResponse: ApiResponse<Cliente> = {
  success: true,
  data: exampleCliente,
  message: 'Cliente encontrado com sucesso'
};

const errorResponse: ApiResponse = {
  success: false,
  error: 'Cliente não encontrado',
  message: 'O cliente com o ID especificado não existe'
};

const paginatedResponse: PaginatedResponse<Cidade> = {
  data: [exampleCidade],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  }
};

// Example Validation usage
const validationRule: ValidationRule = {
  required: true,
  minLength: 5,
  maxLength: 100,
  pattern: /^[A-Za-z\s]+$/,
  type: 'email'
};

const validationError: ValidationError = {
  field: 'nome',
  message: validationMessages.required,
  code: 'REQUIRED'
};

// Validation rules examples
console.log('Cliente validation rules:', clienteValidationRules);
console.log('Imovel validation rules:', imovelValidationRules);
console.log('Cidade validation rules:', cidadeValidationRules);
console.log('Image validation rules:', imageValidationRules);

// This file compiles successfully if all types are properly defined
export {
  exampleCliente,
  exampleCidade,
  exampleImovel,
  successResponse,
  errorResponse,
  paginatedResponse,
  validationRule,
  validationError
};