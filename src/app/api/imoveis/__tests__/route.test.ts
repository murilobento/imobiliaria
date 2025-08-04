import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({
                data: [
                  {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    nome: 'Casa Teste',
                    tipo: 'Casa',
                    finalidade: 'venda',
                    valor_venda: 250000,
                    quartos: 3,
                    banheiros: 2,
                    ativo: true
                  }
                ],
                error: null,
                count: 1
              }))
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              nome: 'Casa Teste',
              tipo: 'Casa',
              finalidade: 'venda',
              valor_venda: 250000,
              quartos: 3,
              banheiros: 2,
              ativo: true
            },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('/api/imoveis', () => {
  describe('GET', () => {
    it('should return list of imoveis with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/imoveis');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('totalPages');
    });

    it('should handle filters correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/imoveis?tipo=Casa&finalidade=venda');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
    });

    it('should handle search parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/imoveis?search=Casa');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
    });

    it('should handle pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/imoveis?page=2&limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(5);
    });
  });

  describe('POST', () => {
    it('should create a new imovel successfully', async () => {
      const imovelData = {
        nome: 'Casa Teste',
        tipo: 'Casa',
        finalidade: 'venda',
        valor_venda: 250000,
        quartos: 3,
        banheiros: 2,
        caracteristicas: ['Garagem'],
        comodidades: ['Piscina'],
        ativo: true
      };

      const request = new NextRequest('http://localhost:3000/api/imoveis', {
        method: 'POST',
        body: JSON.stringify(imovelData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.nome).toBe('Casa Teste');
      expect(data.tipo).toBe('Casa');
      expect(data.finalidade).toBe('venda');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        nome: 'Ab', // Too short
        tipo: '',
        finalidade: ''
      };

      const request = new NextRequest('http://localhost:3000/api/imoveis', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should validate valor_venda for venda finalidade', async () => {
      const invalidData = {
        nome: 'Casa Teste',
        tipo: 'Casa',
        finalidade: 'venda',
        valor_venda: 0 // Invalid for venda
      };

      const request = new NextRequest('http://localhost:3000/api/imoveis', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Valor de venda é obrigatório');
    });

    it('should validate valor_aluguel for aluguel finalidade', async () => {
      const invalidData = {
        nome: 'Casa Teste',
        tipo: 'Casa',
        finalidade: 'aluguel',
        valor_aluguel: 0 // Invalid for aluguel
      };

      const request = new NextRequest('http://localhost:3000/api/imoveis', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Valor de aluguel é obrigatório');
    });

    it('should validate at least one value for ambos finalidade', async () => {
      const invalidData = {
        nome: 'Casa Teste',
        tipo: 'Casa',
        finalidade: 'ambos',
        valor_venda: 0,
        valor_aluguel: 0
      };

      const request = new NextRequest('http://localhost:3000/api/imoveis', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Pelo menos um valor');
    });
  });
});