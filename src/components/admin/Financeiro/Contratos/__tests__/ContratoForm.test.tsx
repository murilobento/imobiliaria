import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorProvider } from '../../../Common/ErrorProvider';
import ContratoForm from '../ContratoForm';
import { ContratoAluguel, CONTRATO_STATUS } from '../../../../../types/financeiro';
import { supabase } from '../../../../../lib/supabase';

// Mock Supabase
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      }))
    }))
  }
}));

const mockImoveis = [
  {
    id: 'imovel-1',
    endereco: 'Rua das Flores, 123',
    cidade: { nome: 'São Paulo' }
  },
  {
    id: 'imovel-2',
    endereco: 'Av. Paulista, 456',
    cidade: { nome: 'São Paulo' }
  }
];

const mockClientes = [
  {
    id: 'cliente-1',
    nome: 'João Silva',
    email: 'joao@email.com',
    telefone: '11999999999'
  },
  {
    id: 'cliente-2',
    nome: 'Maria Santos',
    email: 'maria@email.com',
    telefone: '11888888888'
  }
];

const mockContrato: ContratoAluguel = {
  id: '1',
  imovel_id: 'imovel-1',
  inquilino_id: 'cliente-1',
  proprietario_id: 'cliente-2',
  valor_aluguel: 1500,
  valor_deposito: 1500,
  data_inicio: '2024-01-01',
  data_fim: '2024-12-31',
  dia_vencimento: 10,
  status: CONTRATO_STATUS.ATIVO,
  observacoes: 'Contrato de teste',
  created_at: '2024-01-01T00:00:00Z'
};

describe('ContratoForm', () => {
  let queryClient: QueryClient;
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Mock Supabase responses
    const mockSupabaseChain = {
      select: vi.fn(() => mockSupabaseChain),
      order: vi.fn(() => mockSupabaseChain),
      data: null,
      error: null
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'imoveis') {
        return {
          ...mockSupabaseChain,
          data: mockImoveis,
          error: null
        } as any;
      }
      if (table === 'clientes') {
        return {
          ...mockSupabaseChain,
          data: mockClientes,
          error: null
        } as any;
      }
      return mockSupabaseChain as any;
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <ContratoForm
            onSave={mockOnSave}
            onCancel={mockOnCancel}
            {...props}
          />
        </ErrorProvider>
      </QueryClientProvider>
    );
  };

  it('renders form for new contract', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Novo Contrato')).toBeInTheDocument();
    });

    // Check required fields
    expect(screen.getByText('Imóvel *')).toBeInTheDocument();
    expect(screen.getByText('Inquilino *')).toBeInTheDocument();
    expect(screen.getByText('Valor do Aluguel *')).toBeInTheDocument();
    expect(screen.getByText('Data de Início *')).toBeInTheDocument();
    expect(screen.getByText('Data de Fim *')).toBeInTheDocument();
    expect(screen.getByText('Dia do Vencimento *')).toBeInTheDocument();

    // Check optional fields
    expect(screen.getByText('Proprietário')).toBeInTheDocument();
    expect(screen.getByText('Valor do Depósito')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Observações')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText('Criar Contrato')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('renders form for editing contract', async () => {
    renderComponent({ contrato: mockContrato });

    await waitFor(() => {
      expect(screen.getByText('Editar Contrato')).toBeInTheDocument();
    });

    expect(screen.getByText('Atualizar Contrato')).toBeInTheDocument();

    // Check if form is populated with contract data
    await waitFor(() => {
      expect(screen.getByDisplayValue('1500')).toBeInTheDocument(); // valor_aluguel
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument(); // data_inicio
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument(); // data_fim
      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // dia_vencimento
      expect(screen.getByDisplayValue('Contrato de teste')).toBeInTheDocument(); // observacoes
    });
  });

  it('shows loading state when fetching data', () => {
    // Mock loading state
    vi.mocked(supabase.from).mockImplementation(() => {
      return new Promise(() => {}) as any; // Never resolves
    });

    renderComponent();

    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Criar Contrato')).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    fireEvent.click(screen.getByText('Criar Contrato'));

    await waitFor(() => {
      expect(screen.getByText('Selecione um imóvel')).toBeInTheDocument();
      expect(screen.getByText('Selecione um inquilino')).toBeInTheDocument();
      expect(screen.getByText('Informe o valor do aluguel')).toBeInTheDocument();
      expect(screen.getByText('Informe a data de início')).toBeInTheDocument();
      expect(screen.getByText('Informe a data de fim')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates value fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
    });

    const valorAluguelInput = screen.getAllByPlaceholderText('0,00')[0];
    fireEvent.change(valorAluguelInput, { target: { value: '-100' } });

    fireEvent.click(screen.getByText('Criar Contrato'));

    await waitFor(() => {
      expect(screen.getByText('Valor deve ser maior que R$ 0.01')).toBeInTheDocument();
    });
  });

  it('validates date fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Criar Contrato')).toBeInTheDocument();
    });

    // Set end date before start date
    const dataInicioInput = screen.getByDisplayValue('');
    const dataFimInput = screen.getAllByDisplayValue('')[1];

    fireEvent.change(dataInicioInput, { target: { value: '2024-12-31' } });
    fireEvent.change(dataFimInput, { target: { value: '2024-01-01' } });

    fireEvent.click(screen.getByText('Criar Contrato'));

    await waitFor(() => {
      expect(screen.getByText('Data de fim deve ser posterior à data de início')).toBeInTheDocument();
    });
  });

  it('validates due day field', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    const diaVencimentoInput = screen.getByDisplayValue('10');
    fireEvent.change(diaVencimentoInput, { target: { value: '35' } });

    fireEvent.click(screen.getByText('Criar Contrato'));

    await waitFor(() => {
      expect(screen.getByText('Dia deve estar entre 1 e 31')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Selecione um imóvel')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'imovel-1' } });
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'cliente-1' } }); // inquilino

    const valorInput = screen.getAllByPlaceholderText('0,00')[0];
    fireEvent.change(valorInput, { target: { value: '1500' } });

    const dateInputs = screen.getAllByDisplayValue('');
    fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2024-12-31' } });

    fireEvent.click(screen.getByText('Criar Contrato'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        imovel_id: 'imovel-1',
        inquilino_id: 'cliente-1',
        proprietario_id: undefined,
        valor_aluguel: 1500,
        valor_deposito: undefined,
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        dia_vencimento: 10,
        status: CONTRATO_STATUS.ATIVO,
        observacoes: undefined
      });
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during submission', async () => {
    renderComponent({ loading: true });

    await waitFor(() => {
      expect(screen.getByText('Criar Contrato')).toBeDisabled();
      expect(screen.getByText('Cancelar')).toBeDisabled();
    });
  });

  it('clears validation errors when user starts typing', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Criar Contrato')).toBeInTheDocument();
    });

    // Trigger validation error
    fireEvent.click(screen.getByText('Criar Contrato'));

    await waitFor(() => {
      expect(screen.getByText('Selecione um imóvel')).toBeInTheDocument();
    });

    // Start typing in the field
    const imovelSelect = screen.getByDisplayValue('');
    fireEvent.change(imovelSelect, { target: { value: 'imovel-1' } });

    // Error should be cleared
    expect(screen.queryByText('Selecione um imóvel')).not.toBeInTheDocument();
  });

  it('limits observations text length', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Observações adicionais sobre o contrato...')).toBeInTheDocument();
    });

    const observacoesTextarea = screen.getByPlaceholderText('Observações adicionais sobre o contrato...');
    
    // Check character counter
    expect(screen.getByText('0/1000 caracteres')).toBeInTheDocument();

    // Type some text
    fireEvent.change(observacoesTextarea, { target: { value: 'Test observation' } });
    expect(screen.getByText('16/1000 caracteres')).toBeInTheDocument();
  });
});