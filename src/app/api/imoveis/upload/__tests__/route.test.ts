import { NextRequest } from 'next/server';
import { POST, DELETE } from '../route';
import { supabase } from '@/lib/supabase';
import { processImageSet, validateImage } from '@/lib/utils/imageProcessing';

// Mock das dependências
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

vi.mock('@/lib/utils/imageProcessing', () => ({
  processImageSet: vi.fn(),
  validateImage: vi.fn()
}));

describe('/api/imoveis/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return error when no images are provided', async () => {
      const formData = new FormData();
      formData.append('imovelId', 'test-imovel-id');

      const request = new NextRequest('http://localhost:3000/api/imoveis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Nenhuma imagem foi enviada');
    });

    it('should return error when imovelId is not provided', async () => {
      const formData = new FormData();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('images', mockFile);

      const request = new NextRequest('http://localhost:3000/api/imoveis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID do imóvel é obrigatório');
    });

    it('should reject unsupported file types', async () => {
      const formData = new FormData();
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('images', mockFile);
      formData.append('imovelId', 'test-imovel-id');

      const request = new NextRequest('http://localhost:3000/api/imoveis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toContain('Tipo de arquivo não suportado');
    });

    it('should reject files that are too large', async () => {
      const formData = new FormData();
      // Cria um arquivo mock que simula ser maior que 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      formData.append('images', largeFile);
      formData.append('imovelId', 'test-imovel-id');

      const request = new NextRequest('http://localhost:3000/api/imoveis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toContain('Arquivo muito grande');
    });
  });

  describe('DELETE', () => {
    it('should return error when image ID is not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/imoveis/upload', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID da imagem é obrigatório');
    });

    it('should return error when image is not found', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/imoveis/upload?id=non-existent', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Imagem não encontrada');
    });
  });
});