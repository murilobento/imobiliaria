import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CalendarioPagamentos from '../CalendarioPagamentos'
import { fetchPagamentos } from '@/lib/api/pagamentos'
import { PagamentoAluguel, PAGAMENTO_STATUS } from '@/types/financeiro'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock das dependências
jest.mock('@/lib/api/pagamentos')
jest.mock('../PagamentoForm', () => {
  return function MockPagamentoForm({ onSuccess, onCancel }: any) {
    return (
      <div data-testid="pagamento-form">
        <button onClick={() => onSuccess('Pagamento salvo com sucesso!')}>
          Salvar
        </button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    )
  }
})

const mockFetchPagamentos = fetchPagamentos as jest.MockedFunction<typeof fetchPagamentos>

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
  },
  {
    id: '3',
    contrato_id: 'contrato-3',
    mes_referencia: '2024-01-01',
    valor_devido: 1800,
    data_vencimento: '2024-01-25',
    valor_juros: 0,
    valor_multa: 0,
    status: PAGAMENTO_STATUS.PENDENTE,
    contrato: {
      id: 'contrato-3',
      imovel_id: 'imovel-3',
      inquilino_id: 'inquilino-3',
      valor_aluguel: 1800,
      data_inicio: '2024-01-01',
      data_fim: '2024-12-31',
      dia_vencimento: 25,
      status: 'ativo',
      imovel: {
        id: 'imovel-3',
        endereco: 'Rua Central, 789'
      },
      inquilino: {
        id: 'inquilino-3',
        nome: 'Pedro Costa'
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

describe('CalendarioPagamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchPagamentos.mockResolvedValue(mockPagamentos)
    
    // Mock da data atual para testes consistentes
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('deve renderizar calendário com mês atual', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('janeiro de 2024')).toBeInTheDocument()
    })

    expect(screen.getByText('3 pagamento(s) no mês')).toBeInTheDocument()
  })

  it('deve exibir dias da semana no cabeçalho', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Seg')).toBeInTheDocument()
    })

    expect(screen.getByText('Ter')).toBeInTheDocument()
    expect(screen.getByText('Qua')).toBeInTheDocument()
    expect(screen.getByText('Qui')).toBeInTheDocument()
    expect(screen.getByText('Sex')).toBeInTheDocument()
    expect(screen.getByText('Sáb')).toBeInTheDocument()
    expect(screen.getByText('Dom')).toBeInTheDocument()
  })

  it('deve exibir pagamentos nos dias corretos', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('Pedro Costa')).toBeInTheDocument()
  })

  it('deve exibir legenda de status', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Pendente')).toBeInTheDocument()
    })

    expect(screen.getByText('Pago')).toBeInTheDocument()
    expect(screen.getByText('Atrasado')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('deve navegar entre meses', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('janeiro de 2024')).toBeInTheDocument()
    })

    // Navegar para próximo mês
    const nextButton = screen.getByRole('button', { name: /próximo/i }) || 
                      screen.getAllByRole('button').find(btn => btn.innerHTML.includes('M9 5l7 7-7 7'))
    
    if (nextButton) {
      fireEvent.click(nextButton)
    }

    await waitFor(() => {
      expect(mockFetchPagamentos).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            data_vencimento_inicio: '2024-02-01',
            data_vencimento_fim: '2024-02-29'
          })
        })
      )
    })
  })

  it('deve voltar para hoje ao clicar em "Hoje"', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Hoje')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Hoje'))

    await waitFor(() => {
      expect(screen.getByText('janeiro de 2024')).toBeInTheDocument()
    })
  })

  it('deve exibir resumo do mês', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Total de Pagamentos')).toBeInTheDocument()
    })

    expect(screen.getByText('Pagos')).toBeInTheDocument()
    expect(screen.getByText('Pendentes')).toBeInTheDocument()
    expect(screen.getByText('Atrasados')).toBeInTheDocument()

    // Verificar contadores
    const totalCards = screen.getAllByText('3')
    const pagosCards = screen.getAllByText('1')
    const pendentesCards = screen.getAllByText('1')
    const atrasadosCards = screen.getAllByText('1')

    expect(totalCards.length).toBeGreaterThan(0)
    expect(pagosCards.length).toBeGreaterThan(0)
    expect(pendentesCards.length).toBeGreaterThan(0)
    expect(atrasadosCards.length).toBeGreaterThan(0)
  })

  it('deve exibir resumo financeiro', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Resumo Financeiro do Mês')).toBeInTheDocument()
    })

    expect(screen.getByText('Valor Total Devido')).toBeInTheDocument()
    expect(screen.getByText('Valor Total Pago')).toBeInTheDocument()
    expect(screen.getByText('Juros e Multas')).toBeInTheDocument()

    // Verificar valores formatados
    expect(screen.getByText('R$ 5.300,00')).toBeInTheDocument() // Total devido
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument() // Total pago
    expect(screen.getByText('R$ 60,00')).toBeInTheDocument() // Juros e multas
  })

  it('deve abrir modal ao clicar em pagamento', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('João Silva'))

    await waitFor(() => {
      expect(screen.getByTestId('pagamento-form')).toBeInTheDocument()
    })
  })

  it('deve chamar onPagamentoSelect quando fornecido', async () => {
    const mockOnSelect = jest.fn()
    render(<CalendarioPagamentos onPagamentoSelect={mockOnSelect} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('João Silva'))

    expect(mockOnSelect).toHaveBeenCalledWith(mockPagamentos[0])
  })

  it('deve filtrar por contrato quando contratoId é fornecido', async () => {
    render(<CalendarioPagamentos contratoId="contrato-1" />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetchPagamentos).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            contrato_id: 'contrato-1'
          })
        })
      )
    })
  })

  it('deve destacar o dia atual', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Procurar pelo dia 15 (data atual mockada) com destaque
      const dayElements = screen.getAllByText('15')
      const highlightedDay = dayElements.find(el => 
        el.className.includes('text-blue-600') || 
        el.closest('div')?.className.includes('bg-blue-50')
      )
      expect(highlightedDay).toBeInTheDocument()
    })
  })

  it('deve exibir tooltip com informações do pagamento', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      const pagamentoElement = screen.getByText('João Silva')
      expect(pagamentoElement).toHaveAttribute('title', 'João Silva - R$ 1.500,00')
    })
  })

  it('deve aplicar cores corretas baseadas no status', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      const joaoElement = screen.getByText('João Silva')
      const mariaElement = screen.getByText('Maria Santos')
      const pedroElement = screen.getByText('Pedro Costa')

      // Verificar classes de cor baseadas no status
      expect(joaoElement.closest('div')).toHaveClass('bg-green-100', 'text-green-800')
      expect(mariaElement.closest('div')).toHaveClass('bg-red-100', 'text-red-800')
      expect(pedroElement.closest('div')).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })
  })

  it('deve exibir mensagem de erro quando falha ao carregar', async () => {
    mockFetchPagamentos.mockRejectedValue(new Error('Erro de rede'))

    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar pagamentos/)).toBeInTheDocument()
    })

    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('deve fechar modal após sucesso no formulário', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Abrir modal
    fireEvent.click(screen.getByText('João Silva'))

    await waitFor(() => {
      expect(screen.getByTestId('pagamento-form')).toBeInTheDocument()
    })

    // Simular sucesso no formulário
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(screen.queryByTestId('pagamento-form')).not.toBeInTheDocument()
    })
  })

  it('deve exibir dias de outros meses com estilo diferente', async () => {
    render(<CalendarioPagamentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Verificar se existem dias com classe de mês anterior/posterior
      const calendarDays = screen.getAllByText(/^\d+$/)
      const otherMonthDays = calendarDays.filter(day => 
        day.className.includes('text-gray-400')
      )
      expect(otherMonthDays.length).toBeGreaterThan(0)
    })
  })
})