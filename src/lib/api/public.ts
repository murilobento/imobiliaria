import { apiClient } from './client';

// Tipos para as APIs públicas
export interface PublicCidade {
  id: string;
  nome: string;
}

export interface PublicImovel {
  id: string;
  nome: string;
  tipo: string;
  finalidade: 'venda' | 'aluguel' | 'ambos';
  valor_venda?: number;
  valor_aluguel?: number;
  descricao?: string;
  quartos: number;
  banheiros: number;
  area_total?: number;
  caracteristicas: string[];
  comodidades: string[];
  endereco_completo?: string;
  bairro?: string;
  destaque: boolean;
  created_at: string;
  cidade?: {
    id: string;
    nome: string;
  };
  cliente?: {
    id: string;
    nome: string;
  };
  imagens: {
    id: string;
    url: string;
    url_thumb?: string;
    ordem: number;
    tipo: 'retrato' | 'paisagem';
  }[];
}

export interface PublicImoveisResponse {
  success: boolean;
  data: PublicImovel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PublicImoveisDestaqueResponse {
  success: boolean;
  data: PublicImovel[];
  total: number;
}

export interface PublicCidadesResponse {
  success: boolean;
  data: PublicCidade[];
}

// Parâmetros para busca de imóveis
export interface PublicImoveisParams {
  page?: number;
  limit?: number;
  tipo?: string;
  finalidade?: string;
  cidade_id?: string;
  search?: string;
}

// Parâmetros para imóveis em destaque
export interface PublicImoveisDestaqueParams {
  limit?: number;
  tipo?: string;
  cidade_id?: string;
}

// API para buscar cidades ativas
export const getPublicCidades = async (): Promise<PublicCidade[]> => {
  const response = await apiClient.get<PublicCidadesResponse>('/public/cidades');
  return response.data;
};

// API para buscar imóveis públicos
export const getPublicImoveis = async (params: PublicImoveisParams = {}): Promise<PublicImoveisResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.tipo) searchParams.append('tipo', params.tipo);
  if (params.finalidade) searchParams.append('finalidade', params.finalidade);
  if (params.cidade_id) searchParams.append('cidade_id', params.cidade_id);
  if (params.search) searchParams.append('search', params.search);

  const url = `/public/imoveis${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  return await apiClient.get<PublicImoveisResponse>(url);
};

// API para buscar imóveis em destaque
export const getPublicImoveisDestaque = async (params: PublicImoveisDestaqueParams = {}): Promise<PublicImovel[]> => {
  const searchParams = new URLSearchParams();
  
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.tipo) searchParams.append('tipo', params.tipo);
  if (params.cidade_id) searchParams.append('cidade_id', params.cidade_id);

  const url = `/public/imoveis/destaque${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await apiClient.get<PublicImoveisDestaqueResponse>(url);
  return response.data;
};