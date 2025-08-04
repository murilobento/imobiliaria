import { ConfiguracaoFinanceira, CreateConfiguracaoData, UpdateConfiguracaoData } from '@/types/financeiro';

const API_BASE_URL = '/api/configuracoes-financeiras';

export interface ConfiguracoesFinanceirasAPI {
  buscarConfiguracoes(): Promise<ConfiguracaoFinanceira>;
  atualizarConfiguracoes(data: Partial<CreateConfiguracaoData>): Promise<ConfiguracaoFinanceira>;
}

class ConfiguracoesFinanceirasService implements ConfiguracoesFinanceirasAPI {
  /**
   * Busca as configurações financeiras do usuário atual
   * Se não existir, cria uma configuração padrão automaticamente
   */
  async buscarConfiguracoes(): Promise<ConfiguracaoFinanceira> {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Atualiza as configurações financeiras do usuário atual
   * Se não existir configuração, cria uma nova
   */
  async atualizarConfiguracoes(data: Partial<CreateConfiguracaoData>): Promise<ConfiguracaoFinanceira> {
    const response = await fetch(API_BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    return response.json();
  }
}

// Instância singleton do serviço
export const configuracoesFinanceirasAPI = new ConfiguracoesFinanceirasService();

// Funções de conveniência para uso direto
export const buscarConfiguracoes = () => configuracoesFinanceirasAPI.buscarConfiguracoes();
export const atualizarConfiguracoes = (data: Partial<CreateConfiguracaoData>) => 
  configuracoesFinanceirasAPI.atualizarConfiguracoes(data);

// Valores padrão para configurações
export const CONFIGURACOES_PADRAO: CreateConfiguracaoData = {
  taxa_juros_mensal: 0.01, // 1% ao mês
  taxa_multa: 0.02, // 2%
  taxa_comissao: 0.10, // 10%
  dias_carencia: 5
};

// Utilitários para formatação e validação
export const formatarTaxaPercentual = (taxa: number): string => {
  return `${(taxa * 100).toFixed(2)}%`;
};

export const formatarDiasCarencia = (dias: number): string => {
  return dias === 1 ? '1 dia' : `${dias} dias`;
};

export const validarTaxa = (taxa: number): boolean => {
  return taxa >= 0 && taxa <= 1;
};

export const validarDiasCarencia = (dias: number): boolean => {
  return dias >= 0 && dias <= 30 && Number.isInteger(dias);
};

// Tipos para formulários
export interface ConfiguracaoFormData {
  taxa_juros_mensal: string;
  taxa_multa: string;
  taxa_comissao: string;
  dias_carencia: number;
}

// Conversores para formulários
export const configuracaoParaForm = (config: ConfiguracaoFinanceira): ConfiguracaoFormData => ({
  taxa_juros_mensal: (config.taxa_juros_mensal * 100).toString(),
  taxa_multa: (config.taxa_multa * 100).toString(),
  taxa_comissao: (config.taxa_comissao * 100).toString(),
  dias_carencia: config.dias_carencia
});

export const formParaConfiguracao = (form: ConfiguracaoFormData): Partial<CreateConfiguracaoData> => ({
  taxa_juros_mensal: parseFloat(form.taxa_juros_mensal) / 100,
  taxa_multa: parseFloat(form.taxa_multa) / 100,
  taxa_comissao: parseFloat(form.taxa_comissao) / 100,
  dias_carencia: form.dias_carencia
});

// Hook personalizado para React Query (se estiver usando)
export const useConfiguracoes = () => {
  return {
    queryKey: ['configuracoes-financeiras'],
    queryFn: buscarConfiguracoes,
  };
};

export const useMutationConfiguracoes = () => {
  return {
    mutationFn: atualizarConfiguracoes,
    onSuccess: () => {
      // Invalidar cache das configurações após atualização
      // queryClient.invalidateQueries(['configuracoes-financeiras']);
    },
  };
};