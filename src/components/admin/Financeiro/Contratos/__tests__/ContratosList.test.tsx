import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorProvider } from '../../../Common/ErrorProvider';
import ContratosList from '../ContratosList';
import { ContratoAluguel, CONTRATO_STATUS } from '../../../../../types/financeiro';
import * as contratosApi from '../../../../../lib/api/contratos';

// Mock the API
vi.mock('../../../../../lib/api/contratos');

const mockContratos: ContratoAluguel[] = [
  {
    id: '1',
    imovel_id: 'imovel-1',
    inquilino_id: 'inquilino-1',
    valor_aluguel: 1500,
    data_inicio: '2024-01-01',
    data_fim: '2024-12-31',
    dia_vencimento: 10,
    status: CONTRATO_STATUS.ATIVO,
    created_at: '2024-01-01T00:00:00Z',
    imovel: {
      id: 'imovel-1',
      endereco: 'Rua das Flores, 123',
      cidade: { nome: 'São Paulo' }
    },
    inquilino: {
      id: 'inquilino-1',
      nome: 'João Silva',
      email: 'joao@email.com'
    }
  },
  {
    id: '2',
    imovel_id: 'imovel-2',
    inquilino_id: 'inquilino-2',
    valor_aluguel: 2000,
    data_inicio: '2024-02-01',
    data_fim: '2025-01-31',
    dia_vencimento: 15,
    status: CONTRATO_STATUS.ENCERRADO,
    created_at: '2024-02-01T00:00:00Z',
    imovel: {
      id: 'imovel-2',
      endereco: 'Av. Paulista, 456',
      cidade: { nome: 'São Paulo' }
    },
    inquilino: {
      id: 'inquilino-2',
      nome: 'Maria Santos',
      email: 'maria@email.com'
    }
  }
];

const mockResponse = {
  data: mockContratos,
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1
};

describe('ContratosList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <ContratosList {...props} />
        </ErrorProvider>
      </QueryClientProvider>
    );
  };

  it('renders contract list correctly', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Contratos de Aluguel')).toBeInTheDocument();
      expect(screen.getByText('2 contratos encontrados')).toBeInTheDocument();
    });

    // Check if contracts are displayed
    expect(screen.getByText('Rua das Flores, 123')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();

    expect(screen.getByText('Av. Paulista, 456')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.000,00')).toBeInTheDocument();
    expect(screen.getByText('Encerrado')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(contratosApi.getContratosList).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const errorMessage = 'Failed to fetch contracts';
    vi.mocked(contratosApi.getContratosList).mockRejectedValue(new Error(errorMessage));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(`Erro ao carregar contratos: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('shows empty state when no contracts', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue({
      ...mockResponse,
      data: [],
      total: 0
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('0 contratos encontrados')).toBeInTheDocument();
      expect(screen.getByText('Nenhum contrato encontrado')).toBeInTheDocument();
    });
  });

  it('calls onNew when new button is clicked', async () => {
    const onNew = vi.fn();
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent({ onNew });

    await waitFor(() => {
      expect(screen.getByText('Novo Contrato')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Novo Contrato'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent({ onEdit });

    await waitFor(() => {
      expect(screen.getAllByTitle('Editar')).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByTitle('Editar')[0]);
    expect(onEdit).toHaveBeenCalledWith(mockContratos[0]);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent({ onDelete });

    await waitFor(() => {
      expect(screen.getAllByTitle('Excluir')).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByTitle('Excluir')[0]);
    expect(onDelete).toHaveBeenCalledWith(mockContratos[0]);
  });

  it('toggles filters panel', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });

    // Filters should not be visible initially (check for filter-specific text)
    expect(screen.queryByDisplayValue('Todos')).not.toBeInTheDocument();

    // Click to show filters
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.getByDisplayValue('Todos')).toBeInTheDocument();

    // Click to hide filters
    fireEvent.click(screen.getByText('Filtros'));
    expect(screen.queryByDisplayValue('Todos')).not.toBeInTheDocument();
  });

  it('applies status filter', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });

    // Show filters
    fireEvent.click(screen.getByText('Filtros'));

    // Select status filter
    const statusSelect = screen.getByDisplayValue('Todos');
    fireEvent.change(statusSelect, { target: { value: CONTRATO_STATUS.ATIVO } });

    await waitFor(() => {
      expect(contratosApi.getContratosList).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: CONTRATO_STATUS.ATIVO
          })
        })
      );
    });
  });

  it('clears filters', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });

    // Show filters
    fireEvent.click(screen.getByText('Filtros'));

    // Apply a filter
    const statusSelect = screen.getByDisplayValue('Todos');
    fireEvent.change(statusSelect, { target: { value: CONTRATO_STATUS.ATIVO } });

    // Clear filters
    await waitFor(() => {
      expect(screen.getByText('Limpar Filtros')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Limpar Filtros'));

    await waitFor(() => {
      expect(contratosApi.getContratosList).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {}
        })
      );
    });
  });

  it('handles search', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue(mockResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por observações...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar por observações...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    await waitFor(() => {
      expect(contratosApi.getContratosList).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test search'
        })
      );
    });
  });

  it('handles pagination', async () => {
    vi.mocked(contratosApi.getContratosList).mockResolvedValue({
      ...mockResponse,
      total: 25,
      totalPages: 3
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mostrando')).toBeInTheDocument();
    });

    // Should show pagination controls
    expect(screen.getByText('de 25 itens')).toBeInTheDocument();

    // Click page 2 button
    const page2Button = screen.getByText('2');
    fireEvent.click(page2Button);

    await waitFor(() => {
      expect(contratosApi.getContratosList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2
        })
      );
    });
  });
});