import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ConfiguracoesFinanceiras from '../ConfiguracoesFinanceiras';

// Mock dos hooks e APIs
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: true,
    canAccessSystem: true
  })
}));

vi.mock('@/lib/api/configuracoes-financeiras', () => ({
  buscarConfiguracoes: vi.fn(),
  atualizarConfiguracoes: vi.fn(),
  configuracaoParaForm: vi.fn(),
  formParaConfiguracao: vi.fn(),
  formatarTaxaPercentual: vi.fn((taxa) => `${(taxa * 100).toFixed(2)}%`),
  formatarDiasCarencia: vi.fn((dias) => dias === 1 ? '1 dia' : `${dias} dias`),
  validarTaxa: vi.fn((taxa) => taxa >= 0 && taxa <= 1),
  validarDiasCarencia: vi.fn((dias) => dias >= 0 && dias <= 30 && Number.isInteger(dias)),
  CONFIGURACOES_PADRAO: {
    taxa_juros_mensal: 0.01,
    taxa_multa: 0.02,
    taxa_comissao: 0.10,
    dias_carencia: 5
  }
}));

// Mock dos componentes
vi.mock('@/components/admin/Common/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('@/components/admin/Common/Toast', () => ({
  default: ({ message, type, onClose }: any) => (
    <div data-testid="toast" data-type={type} onClick={onClose}>
      {message}
    </div>
  )
}));

// Mock do fetch global
global.fetch = vi.fn();

describe('ConfiguracoesFinanceiras', () => {
  const mockConfiguracaoFinanceira = {
    id: '1',
    taxa_juros_mensal: 0.01,
    taxa_multa: 0.02,
    taxa_comissao: 0.10,
    dias_carencia: 5,
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockConfiguracaoNotificacao = {
    id: '1',
    user_id: 'user-1',
    dias_aviso_vencimento: 3,
    notificar_vencimento_proximo: true,
    notificar_pagamento_atrasado: true,
    dias_lembrete_atraso: 7,
    max_lembretes_atraso: 3,
    dias_aviso_contrato_vencendo: 30,
    notificar_contrato_vencendo: true,
    ativo: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock das funções da API
    const { buscarConfiguracoes, configuracaoParaForm } = require('@/lib/api/configuracoes-financeiras');
    buscarConfiguracoes.mockResolvedValue(mockConfiguracaoFinanceira);
    configuracaoParaForm.mockReturnValue({
      taxa_juros_mensal: '1.00',
      taxa_multa: '2.00',
      taxa_comissao: '10.00',
      dias_carencia: 5
    });

    // Mock do fetch para notificações
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/notificacoes/configuracoes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockConfiguracaoNotificacao
          })
        });
      }
      return Promise.reject(new Error('URL não mockada'));
    });
  });

  it('deve renderizar o componente corretamente', async () => {
    render(<ConfiguracoesFinanceiras />);

    // Deve mostrar loading inicialmente
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Aguardar carregamento
    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Verificar se as abas estão presentes
    expect(screen.getByText('Configurações Financeiras')).toBeInTheDocument();
    expect(screen.getByText('Notificações e Alertas')).toBeInTheDocument();
  });

  it('deve carregar e exibir as configurações financeiras', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Verificar se os campos estão preenchidos
    expect(screen.getByDisplayValue('1.00')).toBeInTheDocument(); // Taxa de juros
    expect(screen.getByDisplayValue('2.00')).toBeInTheDocument(); // Taxa de multa
    expect(screen.getByDisplayValue('10.00')).toBeInTheDocument(); // Taxa de comissão
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Dias de carência
  });

  it('deve validar os campos do formulário financeiro', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Inserir valor inválido na taxa de juros
    const taxaJurosInput = screen.getByLabelText(/Taxa de Juros Mensal/);
    fireEvent.change(taxaJurosInput, { target: { value: '150' } });

    // Tentar salvar
    const salvarButton = screen.getByText('Salvar Configurações');
    fireEvent.click(salvarButton);

    // Verificar se a mensagem de erro aparece
    await waitFor(() => {
      expect(screen.getByText('Taxa de juros deve ser entre 0% e 100%')).toBeInTheDocument();
    });
  });

  it('deve alternar entre as abas corretamente', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Clicar na aba de notificações
    const notificacoesTab = screen.getByText('Notificações e Alertas');
    fireEvent.click(notificacoesTab);

    // Verificar se o conteúdo da aba mudou
    expect(screen.getByText('Notificações de Vencimento')).toBeInTheDocument();
    expect(screen.getByText('Notificações de Atraso')).toBeInTheDocument();
    expect(screen.getByText('Notificações de Contrato')).toBeInTheDocument();
  });

  it('deve carregar e exibir as configurações de notificação', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Alternar para aba de notificações
    const notificacoesTab = screen.getByText('Notificações e Alertas');
    fireEvent.click(notificacoesTab);

    // Verificar se os campos estão preenchidos
    await waitFor(() => {
      const diasAvisoInput = screen.getByLabelText(/Dias de antecedência para aviso/);
      expect(diasAvisoInput).toHaveValue(3);
    });

    // Verificar checkboxes
    expect(screen.getByLabelText(/Notificar sobre vencimentos próximos/)).toBeChecked();
    expect(screen.getByLabelText(/Notificar sobre pagamentos atrasados/)).toBeChecked();
    expect(screen.getByLabelText(/Sistema de notificações ativo/)).toBeChecked();
  });

  it('deve salvar as configurações financeiras', async () => {
    const { atualizarConfiguracoes, formParaConfiguracao } = require('@/lib/api/configuracoes-financeiras');
    atualizarConfiguracoes.mockResolvedValue(mockConfiguracaoFinanceira);
    formParaConfiguracao.mockReturnValue({
      taxa_juros_mensal: 0.015,
      taxa_multa: 0.025,
      taxa_comissao: 0.12,
      dias_carencia: 7
    });

    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Alterar um valor
    const taxaJurosInput = screen.getByLabelText(/Taxa de Juros Mensal/);
    fireEvent.change(taxaJurosInput, { target: { value: '1.5' } });

    // Salvar
    const salvarButton = screen.getByText('Salvar Configurações');
    fireEvent.click(salvarButton);

    // Verificar se a função foi chamada
    await waitFor(() => {
      expect(atualizarConfiguracoes).toHaveBeenCalled();
    });

    // Verificar toast de sucesso
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Configurações financeiras salvas com sucesso!')).toBeInTheDocument();
    });
  });

  it('deve salvar as configurações de notificação', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Alternar para aba de notificações
    const notificacoesTab = screen.getByText('Notificações e Alertas');
    fireEvent.click(notificacoesTab);

    await waitFor(() => {
      expect(screen.getByText('Notificações de Vencimento')).toBeInTheDocument();
    });

    // Mock do fetch para PUT
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/notificacoes/configuracoes') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockConfiguracaoNotificacao,
            message: 'Configurações atualizadas com sucesso'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockConfiguracaoNotificacao
        })
      });
    });

    // Alterar um valor
    const diasAvisoInput = screen.getByLabelText(/Dias de antecedência para aviso/);
    fireEvent.change(diasAvisoInput, { target: { value: '5' } });

    // Salvar
    const salvarButton = screen.getByText('Salvar Configurações');
    fireEvent.click(salvarButton);

    // Verificar se o fetch foi chamado
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notificacoes/configuracoes',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"dias_aviso_vencimento":5')
        })
      );
    });

    // Verificar toast de sucesso
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Configurações de notificação salvas com sucesso!')).toBeInTheDocument();
    });
  });

  it('deve mostrar erro quando usuário não tem permissão', () => {
    // Mock para usuário sem permissão
    vi.mocked(require('@/hooks/usePermissions').usePermissions).mockReturnValue({
      isAdmin: false,
      canAccessSystem: false
    });

    render(<ConfiguracoesFinanceiras />);

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.getByText('Você não tem permissão para acessar as configurações financeiras.')).toBeInTheDocument();
  });

  it('deve resetar o formulário quando cancelar', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Alterar um valor
    const taxaJurosInput = screen.getByLabelText(/Taxa de Juros Mensal/);
    fireEvent.change(taxaJurosInput, { target: { value: '5.0' } });

    // Verificar se o valor foi alterado
    expect(taxaJurosInput).toHaveValue('5.0');

    // Cancelar
    const cancelarButton = screen.getByText('Cancelar');
    fireEvent.click(cancelarButton);

    // Verificar se o valor foi resetado
    expect(taxaJurosInput).toHaveValue('1.00');
  });

  it('deve desabilitar campos de notificação quando checkbox está desmarcado', async () => {
    render(<ConfiguracoesFinanceiras />);

    await waitFor(() => {
      expect(screen.getByText('Configurações do Sistema')).toBeInTheDocument();
    });

    // Alternar para aba de notificações
    const notificacoesTab = screen.getByText('Notificações e Alertas');
    fireEvent.click(notificacoesTab);

    await waitFor(() => {
      expect(screen.getByText('Notificações de Vencimento')).toBeInTheDocument();
    });

    // Desmarcar checkbox de vencimento próximo
    const vencimentoCheckbox = screen.getByLabelText(/Notificar sobre vencimentos próximos/);
    fireEvent.click(vencimentoCheckbox);

    // Verificar se o campo de dias foi desabilitado
    const diasAvisoInput = screen.getByLabelText(/Dias de antecedência para aviso/);
    expect(diasAvisoInput).toBeDisabled();
  });
});