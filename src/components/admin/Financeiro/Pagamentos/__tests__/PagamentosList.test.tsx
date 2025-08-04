import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PagamentosList from '../PagamentosList'
import { getPagamentosList } from '@/lib/api/pagamentos'
import { PagamentoAluguel, PAGAMENTO_STATUS } from '@/types/financeiro'

import { vi } from 'vitest'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock das dependências
vi.mock('@/lib/api/pagamentos')
vi.mock('../PagamentoForm', () => ({
  default: ({ onSuccess, onCancel }: any) => (
    <div data-testid="pagamento-form">
      <button onClick={() => onSuccess('Pagamento salvo com sucesso!')}>
        Salvar
      </button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  )
}))

const mockGetPagamentosList = vi.mocked(getPagamentosList)

const mockPagamentos: PagamentoAluguel[] = [
  {
    id: '1',
    contrato_id: 'contrato-1',
    mes_referencia: '2024-01-01',
    valor_devido: 1500,
    valor_pago: 1500,
    data_vencimento: '2024-01-10',
    data_pagamento: '2024-01-08',
    valor_juros: 0,
    valor_multa: 0,
    status: PAGAMENTO_STATUS.PAGO,
    contrato: {
      id: 'contrato-1',
      imovel_id: 'imovel-1',
      inquilino_id: 'inquilino-1',
      valor_aluguel: 1500,
      data_inicio: '2024-01-01',
      data_fim: '2024-12-31',
      dia_vencimento: 10,
      status: 'ativo',
      imovel: {
        id: 'imovel-1',
        endereco: 'Rua das Flores, 123'
      },
      inquilino: {
        id: 'inquilino-1',
        nome: 'João Silva'
      }
    }
  },
  {
    id: '2',
    contrato_id: 'contrato-2',
    mes_referencia: '2024-01-01',
    valor_devido: 2000,
    data_vencimento: '2024-01-15',
    valor_juros: 20,
    valor_multa: 40,
    status: PAGAMENTO_STATUS.ATRASADO,
    contrato: {
      id: 'contrato-2',
      imovel_id: 'imovel-2',
      inquilino_id: 'inquilino-2',
      valor_aluguel: 2000,
      data_inicio: '2024-01-01',
      data_fim: '2024-12-31',
      dia_vencimento: 15,
      status: 'ativo',
      imovel: {
        id: 'imovel-2',
        endereco: 'Av. Principal, 456'
      },
      inquilino: {
        id: 'inquilino-2',
        nome: 'Maria Santos'
      }
    }
  }
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('PagamentosList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPagamentosList.mockResolvedValue({
      data: mockPagamentos,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1
    })
  })

  it('deve renderizar a lista de pagamentos', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Pagamentos')).toBeInTheDocument()
    })

    expect(screen.getByText('2 pagamento(s) encontrado(s)')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('deve exibir filtros quando showFilters é true', async () => {
    render(<PagamentosList showFilters={true} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Status')).toBeInTheDocument()
    expect(screen.getByLabelText('Vencimento (De)')).toBeInTheDocument()
    expect(screen.getByLabelText('Vencimento (Até)')).toBeInTheDocument()
  })

  it('deve abrir modal de novo pagamento ao clicar no botão', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Novo Pagamento')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Novo Pagamento'))

    await waitFor(() => {
      expect(screen.getByTestId('pagamento-form')).toBeInTheDocument()
    })
  })

  it('deve filtrar por status', async () => {
    render(<PagamentosList showFilters={true} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'pago' } })

    await waitFor(() => {
      expect(mockGetPagamentosList).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'pago'
          })
        })
      )
    })
  })

  it('deve buscar por termo de pesquisa', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por observações...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Buscar por observações...')
    fireEvent.change(searchInput, { target: { value: 'teste' } })

    await waitFor(() => {
      expect(mockGetPagamentosList).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'teste'
        })
      )
    })
  })

  it('deve exibir valores formatados corretamente', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 2.000,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 60,00')).toBeInTheDocument() // Juros + Multa do segundo pagamento
    })
  })

  it('deve exibir badges de status corretos', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Pago')).toBeInTheDocument()
      expect(screen.getByText('Atrasado')).toBeInTheDocument()
    })
  })

  it('deve chamar onPagamentoSelect quando fornecido', async () => {
    const mockOnSelect = vi.fn()
    render(<PagamentosList onPagamentoSelect={mockOnSelect} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Simular clique na linha da tabela
    const row = screen.getByText('João Silva').closest('tr')
    if (row) {
      fireEvent.click(row)
    }

    expect(mockOnSelect).toHaveBeenCalledWith(mockPagamentos[0])
  })

  it('deve aplicar filtro de contrato quando contratoId é fornecido', async () => {
    render(<PagamentosList contratoId="contrato-1" />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockGetPagamentosList).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            contrato_id: 'contrato-1'
          })
        })
      )
    })
  })

  it('deve exibir mensagem de erro quando falha ao carregar', async () => {
    mockGetPagamentosList.mockRejectedValue(new Error('Erro de rede'))

    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar pagamentos/)).toBeInTheDocument()
    })

    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('deve limpar filtros ao clicar em "Limpar Filtros"', async () => {
    render(<PagamentosList showFilters={true} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Limpar Filtros')).toBeInTheDocument()
    })

    // Aplicar um filtro primeiro
    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'pago' } })

    // Limpar filtros
    fireEvent.click(screen.getByText('Limpar Filtros'))

    await waitFor(() => {
      expect(statusSelect).toHaveValue('')
    })
  })

  it('deve alterar ordenação', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Vencimento (Mais recente)')).toBeInTheDocument()
    })

    const orderSelect = screen.getByDisplayValue('Vencimento (Mais recente)')
    fireEvent.change(orderSelect, { target: { value: 'valor_devido-desc' } })

    await waitFor(() => {
      expect(mockGetPagamentosList).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'valor_devido',
          orderDirection: 'desc'
        })
      )
    })
  })

  it('deve fechar modal após sucesso no formulário', async () => {
    render(<PagamentosList />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Novo Pagamento')).toBeInTheDocument()
    })

    // Abrir modal
    fireEvent.click(screen.getByText('Novo Pagamento'))

    await waitFor(() => {
      expect(screen.getByTestId('pagamento-form')).toBeInTheDocument()
    })

    // Simular sucesso no formulário
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(screen.queryByTestId('pagamento-form')).not.toBeInTheDocument()
    })
  })
})