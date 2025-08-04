import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorProvider } from '../../../Common/ErrorProvider';
import ContratoDetails from '../ContratoDetails';
import { ContratoAluguel, PagamentoAluguel, CONTRATO_STATUS, PAGAMENTO_STATUS } from '../../../../../types/financeiro';
import * as contratosApi from '../../../../../lib/api/contratos';
import { supabase } from '../../../../../lib/supabase';

// Mock the APIs
vi.mock('../../../../../lib/api/contratos');
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  }
}));

const mockContrato: ContratoAluguel = {
  id: '1',
  imovel_id: 'imovel-1',
  inquilino_id: 'inquilino-1',
  proprietario_id: 'proprietario-1',
  valor_aluguel: 1500,
  valor_deposito: 1500,
  data_inicio: '2024-01-01',
  data_fim: '2024-12-31',
  dia_vencimento: 10,
  status: CONTRATO_STATUS.ATIVO,
  observacoes: 'Contrato de teste',
  created_at: '2024-01-01T00:00:00Z',
  imovel: {
    id: 'imovel-1',
    endereco: 'Rua das Flores, 123',
    cidade: { nome: 'São Paulo' }
  },
  inquilino: {
    id: 'inquilino-1',
    nome: 'João Silva',
    email: 'joao@email.com',
    telefone: '11999999999'
  },
  proprietario: {
    id: 'proprietario-1',
    nome: 'Maria Santos',
    email: 'maria@email.com',
    telefone: '11888888888'
  }
};

const mockPagamentos: PagamentoAluguel[] = [
  {
    id: 'pag-1',
    contrato_id: '1',
    mes_referencia: '2024-01-01',
    valor_devido: 1500,
    valor_pago: 1500,
    data_vencimento: '2024-01-10',
    data_pagamento: '2024-01-08',
    valor_juros: 0,
    valor_multa: 0,
    status: PAGAMENTO_STATUS.PAGO,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pag-2',
    contrato_id: '1',
    mes_referencia: '2024-02-01',
    valor_devido: 1500,
    data_vencimento: '2024-02-10',
    valor_juros: 15,
    valor_multa: 30,
    status: PAGAMENTO_STATUS.ATRASADO,
    created_at: '2024-02-01T00:00:00Z'
  }
];

describe('ContratoDetails', () => {
  let queryClient: QueryClient;
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

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
          <ContratoDetails
            contratoId="1"
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            {...props}
          />
        </ErrorProvider>
      </QueryClientProvider>
    );
  };

  it('renders contract details correctly', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Detalhes do Contrato')).toBeInTheDocument();
    });

    // Check contract information
    expect(screen.getByText('Rua das Flores, 123')).toBeInTheDocument();
    expect(screen.getByText('São Paulo')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('maria@email.com')).toBeInTheDocument();

    // Check financial information
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(screen.getByText('Depósito: R$ 1.500,00')).toBeInTheDocument();

    // Check dates
    expect(screen.getByText('01/01/2024 até 31/12/2024')).toBeInTheDocument();
    expect(screen.getByText('Vencimento: Dia 10')).toBeInTheDocument();

    // Check status
    expect(screen.getByText('Ativo')).toBeInTheDocument();

    // Check observations
    expect(screen.getByText('Contrato de teste')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(contratosApi.getContratoById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();

    expect(screen.getByText('Carregando detalhes do contrato...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const errorMessage = 'Contract not found';
    vi.mocked(contratosApi.getContratoById).mockRejectedValue(new Error(errorMessage));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(`Erro ao carregar contrato: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('shows not found state', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(null as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Contrato não encontrado')).toBeInTheDocument();
    });
  });

  it('calls onEdit when edit button is clicked', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Editar'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockContrato);
  });

  it('calls onDelete when delete button is clicked', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Excluir')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Excluir'));
    expect(mockOnDelete).toHaveBeenCalledWith(mockContrato);
  });

  it('does not show edit/delete buttons when handlers not provided', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);

    renderComponent({ onEdit: undefined, onDelete: undefined });

    await waitFor(() => {
      expect(screen.getByText('Detalhes do Contrato')).toBeInTheDocument();
    });

    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('toggles payment history', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Histórico de Pagamentos')).toBeInTheDocument();
    });

    // Payment history should not be visible initially
    expect(screen.queryByText('Mês Referência')).not.toBeInTheDocument();

    // Click to show payment history
    fireEvent.click(screen.getByText('Histórico de Pagamentos'));

    // Should show loading or payment data
    await waitFor(() => {
      expect(screen.getByText('Carregando histórico...')).toBeInTheDocument();
    });
  });

  it('shows payment history when expanded', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);
    
    // Mock Supabase response for payments
    const mockSupabaseChain = {
      select: vi.fn(() => mockSupabaseChain),
      eq: vi.fn(() => mockSupabaseChain),
      order: vi.fn(() => mockSupabaseChain),
      data: mockPagamentos,
      error: null
    };
    vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Histórico de Pagamentos')).toBeInTheDocument();
    });

    // Expand payment history
    fireEvent.click(screen.getByText('Histórico de Pagamentos'));

    await waitFor(() => {
      expect(screen.getByText('Mês Referência')).toBeInTheDocument();
      expect(screen.getByText('janeiro de 2024')).toBeInTheDocument();
      expect(screen.getByText('fevereiro de 2024')).toBeInTheDocument();
      expect(screen.getByText('Pago')).toBeInTheDocument();
      expect(screen.getByText('Atrasado')).toBeInTheDocument();
    });
  });

  it('shows financial summary when payments are loaded', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);
    
    // Mock Supabase response for payments
    const mockSupabaseChain = {
      select: vi.fn(() => mockSupabaseChain),
      eq: vi.fn(() => mockSupabaseChain),
      order: vi.fn(() => mockSupabaseChain),
      data: mockPagamentos,
      error: null
    };
    vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

    renderComponent();

    // Expand payment history to load payments
    await waitFor(() => {
      expect(screen.getByText('Histórico de Pagamentos')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Histórico de Pagamentos'));

    await waitFor(() => {
      expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
      expect(screen.getByText('Total Pago')).toBeInTheDocument();
      expect(screen.getByText('Total Pendente')).toBeInTheDocument();
      expect(screen.getByText('Juros e Multas')).toBeInTheDocument();
      expect(screen.getByText('Pagamentos Atrasados')).toBeInTheDocument();
    });

    // Check calculated values
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument(); // Total paid
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument(); // Juros e multas (15 + 30)
    expect(screen.getByText('1')).toBeInTheDocument(); // Pagamentos atrasados
  });

  it('calculates contract duration correctly', async () => {
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(mockContrato);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('12 meses')).toBeInTheDocument();
    });
  });

  it('handles contract without owner', async () => {
    const contratoSemProprietario = {
      ...mockContrato,
      proprietario_id: undefined,
      proprietario: undefined
    };
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(contratoSemProprietario);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Detalhes do Contrato')).toBeInTheDocument();
    });

    // Should not show owner section
    expect(screen.getAllByText('João Silva')).toHaveLength(1); // Only inquilino
    expect(screen.queryByText('Proprietário')).not.toBeInTheDocument();
  });

  it('handles contract without deposit', async () => {
    const contratoSemDeposito = {
      ...mockContrato,
      valor_deposito: undefined
    };
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(contratoSemDeposito);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Aluguel: R$ 1.500,00')).toBeInTheDocument();
    });

    // Should not show deposit
    expect(screen.queryByText('Depósito:')).not.toBeInTheDocument();
  });

  it('handles contract without observations', async () => {
    const contratoSemObservacoes = {
      ...mockContrato,
      observacoes: undefined
    };
    vi.mocked(contratosApi.getContratoById).mockResolvedValue(contratoSemObservacoes);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Detalhes do Contrato')).toBeInTheDocument();
    });

    // Should not show observations section
    expect(screen.queryByText('Observações')).not.toBeInTheDocument();
  });
});