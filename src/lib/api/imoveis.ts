import { supabase } from '@/lib/supabase';
import { Imovel, CreateImovelData, UpdateImovelData } from '@/types/imovel';

export interface ImovelImage {
  id: string;
  imovel_id: string;
  url: string;
  url_thumb?: string;
  storage_path?: string;
  ordem: number;
  tipo: 'retrato' | 'paisagem';
  created_at: string;
}

export interface UploadImageResult {
  success: boolean;
  uploaded: Array<{
    index: number;
    filename: string;
    id: string;
    url: string;
    url_thumb: string;
    tipo: 'retrato' | 'paisagem';
    ordem: number;
    processedWidth: number;
    processedHeight: number;
    originalWidth: number;
    originalHeight: number;
  }>;
  errors: Array<{
    index: number;
    filename: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Faz upload de múltiplas imagens para um imóvel
 */
export async function uploadImovelImages(
  imovelId: string,
  files: File[]
): Promise<UploadImageResult> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('images', file);
  });
  
  formData.append('imovelId', imovelId);

  const response = await fetch('/api/imoveis/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro no upload das imagens');
  }

  return response.json();
}

/**
 * Remove uma imagem específica
 */
export async function deleteImovelImage(imageId: string): Promise<void> {
  const response = await fetch(`/api/imoveis/upload?id=${imageId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao remover imagem');
  }
}

/**
 * Busca todas as imagens de um imóvel
 */
export async function getImovelImages(imovelId: string): Promise<ImovelImage[]> {
  const { data, error } = await supabase
    .from('imovel_imagens')
    .select('*')
    .eq('imovel_id', imovelId)
    .order('ordem', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar imagens: ${error.message}`);
  }

  return data || [];
}

/**
 * Atualiza a ordem das imagens
 */
export async function updateImageOrder(
  imageUpdates: Array<{ id: string; ordem: number }>
): Promise<void> {
  const { error } = await supabase
    .from('imovel_imagens')
    .upsert(imageUpdates.map(update => ({
      id: update.id,
      ordem: update.ordem
    })));

  if (error) {
    throw new Error(`Erro ao atualizar ordem das imagens: ${error.message}`);
  }
}

/**
 * Remove todas as imagens de um imóvel
 */
export async function deleteAllImovelImages(imovelId: string): Promise<void> {
  // Busca todas as imagens do imóvel
  const images = await getImovelImages(imovelId);
  
  // Remove cada imagem individualmente para garantir limpeza do storage
  for (const image of images) {
    try {
      await deleteImovelImage(image.id);
    } catch (error) {
      console.error(`Erro ao remover imagem ${image.id}:`, error);
      // Continua removendo as outras imagens mesmo se uma falhar
    }
  }
}
/*
*
 * Busca um imóvel específico com suas imagens
 */
export async function getImovelById(id: string): Promise<Imovel> {
  const response = await fetch(`/api/imoveis/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar imóvel');
  }

  const imovel = await response.json();
  
  // Buscar imagens do imóvel
  try {
    const images = await getImovelImages(id);
    imovel.imagens = images;
  } catch (error) {
    console.error('Erro ao buscar imagens do imóvel:', error);
    imovel.imagens = [];
  }

  return imovel;
}

/**
 * Cria um novo imóvel
 */
export async function createImovel(imovelData: CreateImovelData): Promise<Imovel> {
  const response = await fetch('/api/imoveis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(imovelData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar imóvel');
  }

  return response.json();
}

/**
 * Atualiza um imóvel existente
 */
export async function updateImovel(id: string, imovelData: Partial<UpdateImovelData>): Promise<Imovel> {
  const response = await fetch(`/api/imoveis/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(imovelData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar imóvel');
  }

  return response.json();
}

/**
 * Exclui um imóvel
 */
export async function deleteImovel(id: string): Promise<void> {
  const response = await fetch(`/api/imoveis/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao excluir imóvel');
  }
}

export interface ImovelFilters {
  tipo?: string;
  finalidade?: string;
  cidade_id?: string;
  destaque?: boolean;
  ativo?: boolean;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ImoveisResponse {
  data: Imovel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Busca imóveis com filtros e paginação
 */
export async function getImoveis(
  filters: ImovelFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<ImoveisResponse> {
  const searchParams = new URLSearchParams();
  
  // Adicionar filtros
  if (filters.tipo) searchParams.append('tipo', filters.tipo);
  if (filters.finalidade) searchParams.append('finalidade', filters.finalidade);
  if (filters.cidade_id) searchParams.append('cidade_id', filters.cidade_id);
  if (filters.destaque !== undefined) searchParams.append('destaque', filters.destaque.toString());
  if (filters.ativo !== undefined) searchParams.append('ativo', filters.ativo.toString());
  if (filters.search) searchParams.append('search', filters.search);
  
  // Adicionar paginação
  searchParams.append('page', pagination.page.toString());
  searchParams.append('limit', pagination.limit.toString());

  const response = await fetch(`/api/imoveis?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar imóveis');
  }

  return response.json();
}