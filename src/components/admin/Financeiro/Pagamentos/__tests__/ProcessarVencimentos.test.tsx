import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProcessarVencimentos from '../ProcessarVencimentos'
import { 
  processarVencimentosDiarios, 
  getPagamentosVencidos, 
  getConfiguracaoFinanceira 
} from '@/lib/api/pagamentos'
import { PagamentoAluguel, PAGAMENTO_STATUS, ProcessamentoVencimento } from '@/types/financeiro'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
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
import { it } from 'node:test'
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
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock das dependências
jest.mock('@/lib/api/pagamentos')

const mockProcessarVencimentosDiarios = processarVencimentosDiarios as jest.MockedFunction<typeof processarVencimentosDiarios>
const mockGetPagamentosVencidos = getPagamentosVencidos as jest.MockedFunction<typeof getPagamentosVencidos>
const mockGetConfiguracaoFinanceira = getConfiguracaoFinanceira as jest.MockedFunction<typeof getConfiguracaoFinanceira>

const mockConfiguracao = {
  id: '1',
  taxa_juros_mensal: 0.01,
  taxa_multa: 0.02,
  taxa_comissao: 0.10,
  dias_carencia: 5
}

const mockPagamentosVencidos: PagamentoAluguel[] = [
  {
    id: '1',
    contrato_id: 'contrato-1',
    mes_referencia: '2024-01-01',
    valor_devido: 1500,
    data_vencimento: '2024-01-10',
    valor_juros: 15,
    valor_multa: 30,
    status: PAGAMENTO_STATUS.ATRASADO,
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
    data_vencimento: '2024-01-05',
    valor_juros: 40,
    valor_multa: 40,
    status: PAGAMENTO_STATUS.ATRASADO,
    contrato: {
      id: 'contrato-2',
      imovel_id: 'imovel-2',
      inquilino_id: 'inquilino-2',
      valor_aluguel: 2000,
      data_inicio: '2024-01-01',
      data_fim: '2024-12-31',
      dia_vencimento: 5,
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

const mockResultadoProcessamento: ProcessamentoVencimento = {
  pagamentos_processados: 5,
  pagamentos_vencidos: 2,
  notificacoes_enviadas: 2,
  erros: []
}

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

describe('ProcessarVencimentos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetConfiguracaoFinanceira.mockResolvedValue(mockConfiguracao)
    mockGetPagamentosVencidos.mockResolvedValue(mockPagamentosVencidos)
    mockProcessarVencimentosDiarios.mockResolvedValue(mockResultadoProcessamento)
    
    // Mock da data atual
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-20'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('deve renderizar componente com configurações atuais', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar Vencimentos')).toBeInTheDocument()
    })

    expect(screen.getByText('Configurações Atuais')).toBeInTheDocument()
    expect(screen.getByText('1.00% ao mês')).toBeInTheDocument()
    expect(screen.getByText('2.00%')).toBeInTheDocument()
    expect(screen.getByText('5 dias')).toBeInTheDocument()
    expect(screen.getByText('10.00%')).toBeInTheDocument()
  })

  it('deve exibir data de referência padrão como hoje', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      const dateInput = screen.getByLabelText('Data de Referência') as HTMLInputElement
      expect(dateInput.value).toBe('2024-01-20')
    })
  })

  it('deve exibir lista de pagamentos vencidos', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Pagamentos Vencidos')).toBeInTheDocument()
    })

    expect(screen.getByText('2 pagamento(s)')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('Rua das Flores, 123')).toBeInTheDocument()
    expect(screen.getByText('Av. Principal, 456')).toBeInTheDocument()
  })

  it('deve calcular e exibir dias de atraso corretamente', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      // João: vencimento 10/01, referência 20/01 = 10 dias
      expect(screen.getByText('10 dias')).toBeInTheDocument()
      // Maria: vencimento 05/01, referência 20/01 = 15 dias
      expect(screen.getByText('15 dias')).toBeInTheDocument()
    })
  })

  it('deve exibir valores formatados corretamente', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 2.000,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 45,00')).toBeInTheDocument() // Juros + Multa João
      expect(screen.getByText('R$ 80,00')).toBeInTheDocument() // Juros + Multa Maria
    })
  })

  it('deve aplicar cores baseadas nos dias de atraso', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      const diasAtraso10 = screen.getByText('10 dias')
      const diasAtraso15 = screen.getByText('15 dias')

      // 10 dias = amarelo, 15 dias = laranja
      expect(diasAtraso10).toHaveClass('bg-yellow-100', 'text-yellow-800')
      expect(diasAtraso15).toHaveClass('bg-orange-100', 'text-orange-800')
    })
  })

  it('deve processar vencimentos com sucesso', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Processar'))

    await waitFor(() => {
      expect(mockProcessarVencimentosDiarios).toHaveBeenCalledWith(new Date('2024-01-20'))
    })

    // Verificar resultado do processamento
    await waitFor(() => {
      expect(screen.getByText('Resultado do Processamento')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // Pagamentos processados
      expect(screen.getByText('2')).toBeInTheDocument() // Pagamentos vencidos
      expect(screen.getByText('2')).toBeInTheDocument() // Notificações enviadas
    })
  })

  it('deve alterar data de referência', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      const dateInput = screen.getByLabelText('Data de Referência')
      expect(dateInput).toBeInTheDocument()
    })

    const dateInput = screen.getByLabelText('Data de Referência')
    fireEvent.change(dateInput, { target: { value: '2024-01-25' } })

    await waitFor(() => {
      expect(mockGetPagamentosVencidos).toHaveBeenCalledWith(new Date('2024-01-25'))
    })
  })

  it('deve exibir erro quando data não é selecionada', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      const dateInput = screen.getByLabelText('Data de Referência')
      fireEvent.change(dateInput, { target: { value: '' } })
    })

    fireEvent.click(screen.getByText('Processar'))

    // Verificar se não chamou a API
    expect(mockProcessarVencimentosDiarios).not.toHaveBeenCalled()
  })

  it('deve exibir erros do processamento', async () => {
    const resultadoComErros: ProcessamentoVencimento = {
      pagamentos_processados: 3,
      pagamentos_vencidos: 1,
      notificacoes_enviadas: 1,
      erros: ['Erro ao processar pagamento 123', 'Falha ao enviar notificação']
    }

    mockProcessarVencimentosDiarios.mockResolvedValue(resultadoComErros)

    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Processar'))

    await waitFor(() => {
      expect(screen.getByText('Erros Encontrados (2)')).toBeInTheDocument()
      expect(screen.getByText('• Erro ao processar pagamento 123')).toBeInTheDocument()
      expect(screen.getByText('• Falha ao enviar notificação')).toBeInTheDocument()
    })
  })

  it('deve chamar callback onProcessamentoComplete', async () => {
    const mockCallback = jest.fn()
    render(<ProcessarVencimentos onProcessamentoComplete={mockCallback} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Processar'))

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(mockResultadoProcessamento)
    })
  })

  it('deve tratar erro no processamento', async () => {
    mockProcessarVencimentosDiarios.mockRejectedValue(new Error('Erro de rede'))

    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Processar'))

    await waitFor(() => {
      expect(screen.getByText(/Erro ao processar vencimentos/)).toBeInTheDocument()
    })
  })

  it('deve desabilitar botão durante processamento', async () => {
    // Simular processamento lento
    mockProcessarVencimentosDiarios.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockResultadoProcessamento), 1000))
    )

    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar')).toBeInTheDocument()
    })

    const processarButton = screen.getByText('Processar')
    fireEvent.click(processarButton)

    await waitFor(() => {
      expect(screen.getByText('Processando...')).toBeInTheDocument()
      expect(processarButton).toBeDisabled()
    })
  })

  it('deve exibir informações sobre como funciona o processamento', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Como funciona o processamento:')).toBeInTheDocument()
    })

    expect(screen.getByText(/Busca todos os pagamentos pendentes/)).toBeInTheDocument()
    expect(screen.getByText(/Calcula juros e multa baseado/)).toBeInTheDocument()
    expect(screen.getByText(/Atualiza o status para "atrasado"/)).toBeInTheDocument()
    expect(screen.getByText(/Registra logs de auditoria/)).toBeInTheDocument()
    expect(screen.getByText(/Envia notificações automáticas/)).toBeInTheDocument()
  })

  it('deve exibir mensagem quando não há pagamentos vencidos', async () => {
    mockGetPagamentosVencidos.mockResolvedValue([])

    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('0 pagamento(s)')).toBeInTheDocument()
      expect(screen.getByText('Nenhum pagamento vencido encontrado para a data selecionada')).toBeInTheDocument()
    })
  })

  it('deve exibir loading enquanto carrega configurações', async () => {
    mockGetConfiguracaoFinanceira.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockConfiguracao), 1000))
    )

    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    // Deve mostrar loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('deve atualizar lista de vencidos após processamento', async () => {
    render(<ProcessarVencimentos />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Processar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Processar'))

    await waitFor(() => {
      // Verificar se refetch foi chamado
      expect(mockGetPagamentosVencidos).toHaveBeenCalledTimes(2) // Uma vez no mount, outra no refetch
    })
  })
})