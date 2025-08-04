import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PagamentoForm from '../PagamentoForm'
import { createPagamento, updatePagamento, checkContratoExists, getConfiguracaoFinanceira } from '@/lib/api/pagamentos'
import { fetchContratos } from '@/lib/api/contratos'
import { PagamentoAluguel, PAGAMENTO_STATUS } from '@/types/financeiro'
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
import { it } from 'node:test'
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
import { it } from 'node:test'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock das dependências
jest.mock('@/lib/api/pagamentos')
jest.mock('@/lib/api/contratos')

const mockCreatePagamento = createPagamento as jest.MockedFunction<typeof createPagamento>
const mockUpdatePagamento = updatePagamento as jest.MockedFunction<typeof updatePagamento>
const mockCheckContratoExists = checkContratoExists as jest.MockedFunction<typeof checkContratoExists>
const mockGetConfiguracaoFinanceira = getConfiguracaoFinanceira as jest.MockedFunction<typeof getConfiguracaoFinanceira>
const mockFetchContratos = fetchContratos as jest.MockedFunction<typeof fetchContratos>

const mockConfiguracao = {
  id: '1',
  taxa_juros_mensal: 0.01,
  taxa_multa: 0.02,
  taxa_comissao: 0.10,
  dias_carencia: 5
}

const mockContratos = [
  {
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
]

const mockPagamento: PagamentoAluguel = {
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
  observacoes: 'Pagamento em dia'
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

describe('PagamentoForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetConfiguracaoFinanceira.mockResolvedValue(mockConfiguracao)
    mockFetchContratos.mockResolvedValue(mockContratos)
    mockCheckContratoExists.mockResolvedValue(true)
  })

  it('deve renderizar formulário vazio para novo pagamento', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Contrato *')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Mês de Referência *')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor Devido *')).toBeInTheDocument()
    expect(screen.getByLabelText('Data de Vencimento *')).toBeInTheDocument()
    expect(screen.getByText('Criar')).toBeInTheDocument()
  })

  it('deve preencher formulário ao editar pagamento existente', async () => {
    render(
      <PagamentoForm
        pagamento={mockPagamento}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('1500')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('2024-01-10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-01-08')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pagamento em dia')).toBeInTheDocument()
    expect(screen.getByText('Atualizar')).toBeInTheDocument()
  })

  it('deve usar contrato pré-selecionado quando contratoId é fornecido', async () => {
    render(
      <PagamentoForm
        contratoId="contrato-1"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Contrato pré-selecionado')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Contrato pré-selecionado')).toBeDisabled()
  })

  it('deve calcular juros e multa automaticamente', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Valor Devido *')).toBeInTheDocument()
    })

    // Preencher dados para cálculo
    fireEvent.change(screen.getByLabelText('Valor Devido *'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Data de Vencimento *'), { target: { value: '2024-01-10' } })
    fireEvent.change(screen.getByLabelText('Data de Pagamento'), { target: { value: '2024-01-20' } })

    await waitFor(() => {
      // Verificar se os campos de juros e multa foram preenchidos automaticamente
      const jurosInput = screen.getByLabelText('Valor de Juros') as HTMLInputElement
      const multaInput = screen.getByLabelText('Valor de Multa') as HTMLInputElement
      
      expect(parseFloat(jurosInput.value)).toBeGreaterThan(0)
      expect(parseFloat(multaInput.value)).toBeGreaterThan(0)
    })
  })

  it('deve permitir desabilitar cálculo automático', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Cálculo automático')).toBeInTheDocument()
    })

    // Desabilitar cálculo automático
    fireEvent.click(screen.getByLabelText('Cálculo automático'))

    await waitFor(() => {
      expect(screen.getByLabelText('Valor de Juros')).not.toBeDisabled()
      expect(screen.getByLabelText('Valor de Multa')).not.toBeDisabled()
    })
  })

  it('deve validar campos obrigatórios', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('Criar')).toBeInTheDocument()
    })

    // Tentar submeter sem preencher campos obrigatórios
    fireEvent.click(screen.getByText('Criar'))

    await waitFor(() => {
      expect(screen.getByText('Contrato é obrigatório')).toBeInTheDocument()
      expect(screen.getByText('Mês de referência é obrigatório')).toBeInTheDocument()
      expect(screen.getByText('Valor devido deve ser maior que zero')).toBeInTheDocument()
      expect(screen.getByText('Data de vencimento é obrigatória')).toBeInTheDocument()
    })
  })

  it('deve validar consistência entre status e data de pagamento', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Status *')).toBeInTheDocument()
    })

    // Definir status como "Pago" sem data de pagamento
    fireEvent.change(screen.getByLabelText('Status *'), { target: { value: 'pago' } })
    fireEvent.change(screen.getByLabelText('Valor Devido *'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Data de Vencimento *'), { target: { value: '2024-01-10' } })

    // Selecionar um contrato
    await waitFor(() => {
      const contratoSelect = screen.getByLabelText('Contrato *')
      fireEvent.change(contratoSelect, { target: { value: 'contrato-1' } })
    })

    fireEvent.change(screen.getByLabelText('Mês de Referência *'), { target: { value: '2024-01' } })

    fireEvent.click(screen.getByText('Criar'))

    await waitFor(() => {
      expect(screen.getByText('Data de pagamento é obrigatória quando status é "Pago"')).toBeInTheDocument()
    })
  })

  it('deve criar novo pagamento com sucesso', async () => {
    const mockCreatedPagamento = { ...mockPagamento, id: 'new-id' }
    mockCreatePagamento.mockResolvedValue(mockCreatedPagamento)

    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Contrato *')).toBeInTheDocument()
    })

    // Preencher formulário
    const contratoSelect = screen.getByLabelText('Contrato *')
    fireEvent.change(contratoSelect, { target: { value: 'contrato-1' } })
    
    fireEvent.change(screen.getByLabelText('Mês de Referência *'), { target: { value: '2024-01' } })
    fireEvent.change(screen.getByLabelText('Valor Devido *'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('Data de Vencimento *'), { target: { value: '2024-01-10' } })

    // Submeter formulário
    fireEvent.click(screen.getByText('Criar'))

    await waitFor(() => {
      expect(mockCreatePagamento).toHaveBeenCalledWith(
        expect.objectContaining({
          contrato_id: 'contrato-1',
          valor_devido: 1500,
          data_vencimento: '2024-01-10'
        })
      )
      expect(mockOnSuccess).toHaveBeenCalledWith('Pagamento criado com sucesso!')
    })
  })

  it('deve atualizar pagamento existente com sucesso', async () => {
    const mockUpdatedPagamento = { ...mockPagamento, valor_pago: 1600 }
    mockUpdatePagamento.mockResolvedValue(mockUpdatedPagamento)

    render(
      <PagamentoForm
        pagamento={mockPagamento}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('1500')).toBeInTheDocument()
    })

    // Alterar valor pago
    fireEvent.change(screen.getByLabelText('Valor Pago'), { target: { value: '1600' } })

    // Submeter formulário
    fireEvent.click(screen.getByText('Atualizar'))

    await waitFor(() => {
      expect(mockUpdatePagamento).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          id: '1',
          valor_pago: 1600
        })
      )
      expect(mockOnSuccess).toHaveBeenCalledWith('Pagamento atualizado com sucesso!')
    })
  })

  it('deve exibir resumo dos valores', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('Resumo')).toBeInTheDocument()
    })

    expect(screen.getByText('Valor devido:')).toBeInTheDocument()
    expect(screen.getByText('Juros:')).toBeInTheDocument()
    expect(screen.getByText('Multa:')).toBeInTheDocument()
    expect(screen.getByText('Total:')).toBeInTheDocument()
  })

  it('deve chamar onCancel ao clicar em cancelar', async () => {
    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancelar'))

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('deve tratar erro ao verificar contrato inexistente', async () => {
    mockCheckContratoExists.mockResolvedValue(false)

    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Contrato *')).toBeInTheDocument()
    })

    // Preencher formulário com contrato inválido
    const contratoSelect = screen.getByLabelText('Contrato *')
    fireEvent.change(contratoSelect, { target: { value: 'contrato-inexistente' } })
    
    fireEvent.change(screen.getByLabelText('Mês de Referência *'), { target: { value: '2024-01' } })
    fireEvent.change(screen.getByLabelText('Valor Devido *'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('Data de Vencimento *'), { target: { value: '2024-01-10' } })

    fireEvent.click(screen.getByText('Criar'))

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Contrato não encontrado')
    })
  })

  it('deve tratar erro na criação do pagamento', async () => {
    mockCreatePagamento.mockRejectedValue(new Error('Erro de rede'))

    render(
      <PagamentoForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Contrato *')).toBeInTheDocument()
    })

    // Preencher formulário
    const contratoSelect = screen.getByLabelText('Contrato *')
    fireEvent.change(contratoSelect, { target: { value: 'contrato-1' } })
    
    fireEvent.change(screen.getByLabelText('Mês de Referência *'), { target: { value: '2024-01' } })
    fireEvent.change(screen.getByLabelText('Valor Devido *'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('Data de Vencimento *'), { target: { value: '2024-01-10' } })

    fireEvent.click(screen.getByText('Criar'))

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Erro de rede')
    })
  })
})