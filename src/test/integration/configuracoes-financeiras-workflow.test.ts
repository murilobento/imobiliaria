import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@/lib/supabase-server';
import { ConfiguracaoFinanceira } from '@/types/financeiro';

describe('Configurações Financeiras - Workflow Integration', () => {
  let supabase: any;
  let testUserId: string;

  beforeEach(async () => {
    supabase = createClient();
    
    // Criar usuário de teste
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-config-${Date.now()}@example.com`,
      password: 'testpassword123'
    });

    if (authError) {
      throw new Error(`Erro ao criar usuário de teste: ${authError.message}`);
    }

    testUserId = authData.user?.id;
    if (!testUserId) {
      throw new Error('ID do usuário de teste não foi criado');
    }
  });

  afterEach(async () => {
    if (testUserId) {
      // Limpar dados de teste
      await supabase
        .from('configuracoes_financeiras')
        .delete()
        .eq('user_id', testUserId);

      // Remover usuário de teste
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('deve criar configuração padrão automaticamente', async () => {
    // Fazer requisição GET para buscar configurações (deve criar padrão)
    const response = await fetch('/api/configuracoes-financeiras', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    
    const configuracao: ConfiguracaoFinanceira = await response.json();
    
    // Verificar valores padrão
    expect(configuracao.taxa_juros_mensal).toBe(0.01); // 1%
    expect(configuracao.taxa_multa).toBe(0.02); // 2%
    expect(configuracao.taxa_comissao).toBe(0.10); // 10%
    expect(configuracao.dias_carencia).toBe(5);
    expect(configuracao.user_id).toBe(testUserId);
    expect(configuracao.id).toBeDefined();
    expect(configuracao.created_at).toBeDefined();
    expect(configuracao.updated_at).toBeDefined();
  });

  it('deve atualizar configurações existentes', async () => {
    // Primeiro, criar configuração padrão
    const getResponse = await fetch('/api/configuracoes-financeiras', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      }
    });

    expect(getResponse.status).toBe(200);
    const configuracaoOriginal: ConfiguracaoFinanceira = await getResponse.json();

    // Atualizar configurações
    const novasConfiguracoes = {
      taxa_juros_mensal: 0.015, // 1.5%
      taxa_multa: 0.025, // 2.5%
      taxa_comissao: 0.12, // 12%
      dias_carencia: 7
    };

    const putResponse = await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(novasConfiguracoes)
    });

    expect(putResponse.status).toBe(200);
    
    const configuracaoAtualizada: ConfiguracaoFinanceira = await putResponse.json();
    
    // Verificar se os valores foram atualizados
    expect(configuracaoAtualizada.taxa_juros_mensal).toBe(0.015);
    expect(configuracaoAtualizada.taxa_multa).toBe(0.025);
    expect(configuracaoAtualizada.taxa_comissao).toBe(0.12);
    expect(configuracaoAtualizada.dias_carencia).toBe(7);
    expect(configuracaoAtualizada.user_id).toBe(testUserId);
    expect(configuracaoAtualizada.id).toBe(configuracaoOriginal.id);
    expect(configuracaoAtualizada.updated_at).not.toBe(configuracaoOriginal.updated_at);
  });

  it('deve validar limites das taxas', async () => {
    const configuracaoInvalida = {
      taxa_juros_mensal: 1.5, // 150% - inválido
      taxa_multa: 0.02,
      taxa_comissao: 0.10,
      dias_carencia: 5
    };

    const response = await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configuracaoInvalida)
    });

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData.error).toBe('Dados inválidos');
    expect(errorData.details).toBeDefined();
  });

  it('deve validar dias de carência', async () => {
    const configuracaoInvalida = {
      taxa_juros_mensal: 0.01,
      taxa_multa: 0.02,
      taxa_comissao: 0.10,
      dias_carencia: 35 // Acima do limite
    };

    const response = await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configuracaoInvalida)
    });

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData.error).toBe('Dados inválidos');
    expect(errorData.details).toBeDefined();
  });

  it('deve manter uma configuração por usuário', async () => {
    // Criar primeira configuração
    const primeiraConfig = {
      taxa_juros_mensal: 0.01,
      taxa_multa: 0.02,
      taxa_comissao: 0.10,
      dias_carencia: 5
    };

    const response1 = await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(primeiraConfig)
    });

    expect(response1.status).toBe(200);
    const config1: ConfiguracaoFinanceira = await response1.json();

    // Atualizar configuração (deve atualizar a mesma, não criar nova)
    const segundaConfig = {
      taxa_juros_mensal: 0.015,
      taxa_multa: 0.025,
      taxa_comissao: 0.12,
      dias_carencia: 7
    };

    const response2 = await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(segundaConfig)
    });

    expect(response2.status).toBe(200);
    const config2: ConfiguracaoFinanceira = await response2.json();

    // Deve ser a mesma configuração (mesmo ID)
    expect(config2.id).toBe(config1.id);
    expect(config2.taxa_juros_mensal).toBe(0.015);

    // Verificar que existe apenas uma configuração no banco
    const { data: configuracoes, error } = await supabase
      .from('configuracoes_financeiras')
      .select('*')
      .eq('user_id', testUserId);

    expect(error).toBeNull();
    expect(configuracoes).toHaveLength(1);
    expect(configuracoes[0].id).toBe(config1.id);
  });

  it('deve retornar sempre a configuração mais recente', async () => {
    // Criar configuração inicial
    const configInicial = {
      taxa_juros_mensal: 0.01,
      taxa_multa: 0.02,
      taxa_comissao: 0.10,
      dias_carencia: 5
    };

    await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configInicial)
    });

    // Atualizar configuração
    const configAtualizada = {
      taxa_juros_mensal: 0.02,
      taxa_multa: 0.03,
      taxa_comissao: 0.15,
      dias_carencia: 10
    };

    await fetch('/api/configuracoes-financeiras', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configAtualizada)
    });

    // Buscar configuração atual
    const getResponse = await fetch('/api/configuracoes-financeiras', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUserId}`,
        'Content-Type': 'application/json'
      }
    });

    expect(getResponse.status).toBe(200);
    const configuracao: ConfiguracaoFinanceira = await getResponse.json();

    // Deve retornar os valores atualizados
    expect(configuracao.taxa_juros_mensal).toBe(0.02);
    expect(configuracao.taxa_multa).toBe(0.03);
    expect(configuracao.taxa_comissao).toBe(0.15);
    expect(configuracao.dias_carencia).toBe(10);
  });
});