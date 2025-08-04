import { Cidade } from './cidade';
import { Cliente } from './cliente';

// Tipos para finalidade do imóvel
export type ImovelFinalidade = 'venda' | 'aluguel' | 'ambos';

// Tipos para tipo de imóvel
export type ImovelTipo = 'Apartamento' | 'Casa' | 'Terreno' | 'Chácara' | 'Sítio' | 'Fazenda';

// Tipo para orientação da imagem
export type ImagemTipo = 'retrato' | 'paisagem';

// Interface para Imagem do Imóvel
export interface ImovelImagem {
  id?: string; // UUID do Supabase
  imovel_id: string; // UUID referência
  url: string;
  url_thumb?: string;
  storage_path?: string; // Caminho no Supabase Storage
  ordem: number;
  tipo: ImagemTipo;
  created_at?: string;
}

// Interface para Imóvel
export interface Imovel {
  id?: string; // UUID do Supabase
  nome: string;
  tipo: ImovelTipo;
  finalidade: ImovelFinalidade;
  valor_venda?: number;
  valor_aluguel?: number;
  descricao?: string;
  quartos: number;
  banheiros: number;
  area_total?: number;
  caracteristicas: string[];
  comodidades: string[];
  endereco_completo?: string;
  cidade_id?: string; // UUID referência
  bairro?: string;
  destaque: boolean;
  cliente_id?: string; // UUID referência
  user_id?: string; // UUID do usuário responsável (admin/corretor)
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  imagens?: ImovelImagem[];
  cidade?: Cidade;
  cliente?: Cliente;
  user?: { id: string; email: string; user_metadata?: { name?: string } }; // Dados do usuário responsável
}

// Tipo para criação de imóvel (sem campos auto-gerados)
export interface CreateImovelData {
  nome: string;
  tipo: ImovelTipo;
  finalidade: ImovelFinalidade;
  valor_venda?: number;
  valor_aluguel?: number;
  descricao?: string;
  quartos: number;
  banheiros: number;
  area_total?: number;
  caracteristicas: string[];
  comodidades: string[];
  endereco_completo?: string;
  cidade_id?: string;
  bairro?: string;
  destaque?: boolean;
  cliente_id?: string;
  user_id?: string; // UUID do usuário responsável
  ativo?: boolean;
}

// Tipo para atualização de imóvel
export interface UpdateImovelData {
  id: string;
  nome?: string;
  tipo?: ImovelTipo;
  finalidade?: ImovelFinalidade;
  valor_venda?: number;
  valor_aluguel?: number;
  descricao?: string;
  quartos?: number;
  banheiros?: number;
  area_total?: number;
  caracteristicas?: string[];
  comodidades?: string[];
  endereco_completo?: string;
  cidade_id?: string;
  bairro?: string;
  destaque?: boolean;
  cliente_id?: string;
  user_id?: string; // UUID do usuário responsável
  ativo?: boolean;
}

// Tipo para formulário de imóvel
export interface ImovelFormData {
  nome: string;
  tipo: ImovelTipo;
  finalidade: ImovelFinalidade;
  valor_venda: string; // String para formulário, será convertido para number
  valor_aluguel: string; // String para formulário, será convertido para number
  descricao: string;
  quartos: number;
  banheiros: number;
  area_total: string; // String para formulário, será convertido para number
  caracteristicas: string[];
  comodidades: string[];
  endereco_completo: string;
  cidade_id: string;
  bairro: string;
  destaque: boolean;
  cliente_id: string;
  ativo: boolean;
}

// Tipo para validação de imóvel
export interface ImovelValidation {
  nome: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  tipo: {
    required: boolean;
    enum: ImovelTipo[];
  };
  finalidade: {
    required: boolean;
    enum: ImovelFinalidade[];
  };
  valor_venda: {
    type: 'number';
    min: number;
  };
  valor_aluguel: {
    type: 'number';
    min: number;
  };
  quartos: {
    type: 'number';
    min: number;
    max: number;
  };
  banheiros: {
    type: 'number';
    min: number;
    max: number;
  };
  area_total: {
    type: 'number';
    min: number;
  };
}