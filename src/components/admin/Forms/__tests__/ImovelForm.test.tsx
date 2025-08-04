import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import ImovelForm from '../ImovelForm';
import { Imovel } from '@/types/imovel';

// Mock Next.js router
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack
  })
}));

// Mock API clients
vi.mock('@/lib/api/client', () => ({
  cidadesApi: {
    getAll: vi.fn(() => Promise.resolve({
      cidades: [
        { id: '1', nome: 'São Paulo', ativa: true },
        { id: '2', nome: 'Rio de Janeiro', ativa: true }
      ]
    }))
  },
  clientesApi: {
    getAll: vi.fn(() => Promise.resolve({
      data: [
        { id: '1', nome: 'João Silva', email: 'joao@email.com' },
        { id: '2', nome: 'Maria Santos', email: 'maria@email.com' }
      ]
    }))
  },
  imoveisApi: {
    uploadImages: vi.fn(() => Promise.resolve({
      success: true,
      uploaded: [],
      errors: [],
      summary: { total: 0, successful: 0, failed: 0 }
    }))
  }
}));

// Mock components
vi.mock('@/components/admin/Common/ImageUpload', () => ({
  default: function MockImageUpload({ onUpload, disabled }: any) {
    return (
      <div data-testid="image-upload">
        <button
          onClick={() => onUpload([new File([''], 'test.jpg', { type: 'image/jpeg' })])}
          disabled={disabled}
        >
          Upload Image
        </button>
      </div>
    );
  }
}));

vi.mock('@/components/admin/Common/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
  ButtonSpinner: () => <div data-testid="button-spinner">Saving...</div>
}));

// Mock hooks
vi.mock('@/hooks/useFormValidation', () => ({
  useImovelValidation: vi.fn(() => ({
    fields: {
      nome: { value: '', error: undefined, touched: false, valid: true },
      tipo: { value: 'Casa', error: undefined, touched: false, valid: true },
      finalidade: { value: 'venda', error: undefined, touched: false, valid: true },
      valor_venda: { value: '', error: undefined, touched: false, valid: true },
      valor_aluguel: { value: '', error: undefined, touched: false, valid: true },
      descricao: { value: '', error: undefined, touched: false, valid: true },
      quartos: { value: 0, error: undefined, touched: false, valid: true },
      banheiros: { value: 0, error: undefined, touched: false, valid: true },
      area_total: { value: '', error: undefined, touched: false, valid: true },
      caracteristicas: { value: [], error: undefined, touched: false, valid: true },
      comodidades: { value: [], error: undefined, touched: false, valid: true },
      endereco_completo: { value: '', error: undefined, touched: false, valid: true },
      cidade_id: { value: '', error: undefined, touched: false, valid: true },
      bairro: { value: '', error: undefined, touched: false, valid: true },
      destaque: { value: false, error: undefined, touched: false, valid: true },
      cliente_id: { value: '', error: undefined, touched: false, valid: true },
      ativo: { value: true, error: undefined, touched: false, valid: true }
    },
    isValid: true,
    isSubmitting: false,
    setFieldValue: vi.fn(),
    setFieldErrors: vi.fn(),
    validateAllFields: vi.fn(() => true),
    getValues: vi.fn(() => ({})),
    setSubmitting: vi.fn(),
    getFieldProps: vi.fn(),
    hasFieldError: vi.fn(() => false),
    getFieldError: vi.fn(() => undefined)
  }))
}));

// Mock error context
vi.mock('@/components/admin/Common/ErrorProvider', () => ({
  useErrorContext: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  }),

}));

// Mock network status
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkAwareOperation: () => ({
    executeIfOnline: vi.fn((fn) => fn()),
    isOnline: true
  })
}));

describe('ImovelForm Component', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with all required fields', async () => {
    render(<ImovelForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome do Imóvel/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tipo/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Finalidade/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Quartos/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Banheiros/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Descrição/)).toBeInTheDocument();
    });
  });

  it('should show loading spinner initially', () => {
    render(<ImovelForm onSubmit={mockOnSubmit} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should populate form when editing existing imovel', async () => {
    const existingImovel: Imovel = {
      id: '1',
      nome: 'Casa Teste',
      tipo: 'Casa',
      finalidade: 'venda',
      valor_venda: 300000,
      quartos: 3,
      banheiros: 2,
      destaque: true,
      ativo: true,
      caracteristicas: ['Piscina'],
      comodidades: ['Ar condicionado']
    };

    render(<ImovelForm imovel={existingImovel} onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Casa Teste')).toBeInTheDocument();
    });
  });

  it('should show valor_venda field when finalidade is venda', async () => {
    render(<ImovelForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Valor de Venda/)).toBeInTheDocument();
    });
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    render(<ImovelForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar Imóvel/ })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Criar Imóvel/ });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should show image upload section for existing imovel', async () => {
    const existingImovel: Imovel = {
      id: '1',
      nome: 'Casa Teste',
      tipo: 'Casa',
      finalidade: 'venda',
      quartos: 3,
      banheiros: 2,
      destaque: false,
      ativo: true,
      caracteristicas: [],
      comodidades: []
    };

    render(<ImovelForm imovel={existingImovel} onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
    });
  });

  it('should handle checkbox changes for caracteristicas', async () => {
    const user = userEvent.setup();
    render(<ImovelForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      const piscinaCheckbox = screen.getByLabelText('Piscina');
      expect(piscinaCheckbox).toBeInTheDocument();
    });

    const piscinaCheckbox = screen.getByLabelText('Piscina');
    await user.click(piscinaCheckbox);
  });

  it('should handle checkbox changes for comodidades', async () => {
    const user = userEvent.setup();
    render(<ImovelForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      const arCondicionadoCheckbox = screen.getByLabelText('Ar condicionado');
      expect(arCondicionadoCheckbox).toBeInTheDocument();
    });

    const arCondicionadoCheckbox = screen.getByLabelText('Ar condicionado');
    await user.click(arCondicionadoCheckbox);
  });

  it('should show cancel button that calls router.back', async () => {
    const user = userEvent.setup();
    render(<ImovelForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /Cancelar/ });
      expect(cancelButton).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancelar/ });
    await user.click(cancelButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('should disable form when loading', async () => {
    render(<ImovelForm onSubmit={mockOnSubmit} isLoading={true} />);

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Salvando/ });
      expect(submitButton).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /Cancelar/ });
      expect(cancelButton).toBeDisabled();
    });
  });

  it('should show different button text for editing', async () => {
    const existingImovel: Imovel = {
      id: '1',
      nome: 'Casa Teste',
      tipo: 'Casa',
      finalidade: 'venda',
      quartos: 3,
      banheiros: 2,
      destaque: false,
      ativo: true,
      caracteristicas: [],
      comodidades: []
    };

    render(<ImovelForm imovel={existingImovel} onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Atualizar Imóvel/ })).toBeInTheDocument();
    });
  });
});