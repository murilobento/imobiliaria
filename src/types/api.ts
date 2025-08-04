import { Cliente } from './cliente';
import { Cidade } from './cidade';
import { Imovel } from './imovel';

// Tipos base para respostas de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  type: ErrorType;
  message: string;
  field?: string;
  code?: string;
}

export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  AUTH = 'auth',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission'
}

// Tipos para paginação
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Respostas específicas para cada entidade
export interface ClientesResponse extends ApiResponse<Cliente[]> {}
export interface ClienteResponse extends ApiResponse<Cliente> {}
export interface PaginatedClientesResponse extends ApiResponse<PaginatedResponse<Cliente>> {}

export interface CidadesResponse extends ApiResponse<Cidade[]> {}
export interface CidadeResponse extends ApiResponse<Cidade> {}
export interface PaginatedCidadesResponse extends ApiResponse<PaginatedResponse<Cidade>> {}

export interface ImoveisResponse extends ApiResponse<Imovel[]> {}
export interface ImovelResponse extends ApiResponse<Imovel> {}
export interface PaginatedImoveisResponse extends ApiResponse<PaginatedResponse<Imovel>> {}

// Tipos para filtros específicos
export interface ClienteFilters {
  search?: string;
  email?: string;
  telefone?: string;
}

export interface CidadeFilters {
  search?: string;
  ativa?: boolean;
}

export interface ImovelFilters {
  search?: string;
  tipo?: string;
  finalidade?: string;
  cidade_id?: string;
  destaque?: boolean;
  ativo?: boolean;
  valor_min?: number;
  valor_max?: number;
}

// Tipos para upload de imagens
export interface ImageUploadResponse extends ApiResponse<{
  url: string;
  url_thumb: string;
  storage_path: string;
  tipo: 'retrato' | 'paisagem';
}> {}

export interface MultipleImageUploadResponse extends ApiResponse<{
  images: Array<{
    url: string;
    url_thumb: string;
    storage_path: string;
    tipo: 'retrato' | 'paisagem';
    ordem: number;
  }>;
}> {}

// Tipos para configuração de upload
export interface ImageUploadConfig {
  maxFiles: number;
  maxSize: number; // em bytes
  acceptedTypes: string[];
  dimensions: {
    retrato: {
      width: number;
      height: number;
      quality: number;
    };
    paisagem: {
      width: number;
      height: number;
      quality: number;
    };
    thumbnail: {
      width: number;
      height: number;
      quality: number;
    };
  };
}