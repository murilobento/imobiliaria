import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateConfiguracao } from '@/lib/utils/validation';
import { ConfiguracaoFinanceira, CreateConfiguracaoData, UpdateConfiguracaoData } from '@/types/financeiro';
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware';

// GET - Buscar configurações financeiras
export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const supabase = await createServerSupabaseClient();

      // Buscar configurações do usuário
      const { data: configuracoes, error } = await supabase
        .from('configuracoes_financeiras')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        return NextResponse.json(
          { error: 'Erro interno do servidor' },
          { status: 500 }
        );
      }

      // Se não existir configuração, criar uma padrão
      if (!configuracoes || configuracoes.length === 0) {
        const configuracaoPadrao: CreateConfiguracaoData = {
          taxa_juros_mensal: 0.01, // 1% ao mês
          taxa_multa: 0.02, // 2%
          taxa_comissao: 0.10, // 10%
          dias_carencia: 5,
          user_id: user.id
        };

        const { data: novaConfiguracao, error: createError } = await supabase
          .from('configuracoes_financeiras')
          .insert([configuracaoPadrao])
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar configuração padrão:', createError);
          return NextResponse.json(
            { error: 'Erro ao criar configuração padrão' },
            { status: 500 }
          );
        }

        // Log audit trail for default configuration creation
        await logFinancialAudit(
          'configuracao_create_default',
          'create',
          auditData,
          {
            entityType: 'configuracao',
            entityId: novaConfiguracao.id,
            newValues: configuracaoPadrao
          }
        );

        return NextResponse.json(novaConfiguracao);
      }

      // Log audit trail for configuration access
      await logFinancialAudit(
        'configuracao_view',
        'view',
        auditData,
        {
          entityType: 'configuracao',
          entityId: configuracoes[0].id
        }
      );

      return NextResponse.json(configuracoes[0]);
    } catch (error) {
      console.error('Erro na API de configurações:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    requiredPermission: 'financial.settings.view',
    operation: 'view_configuracoes',
    auditDetails: { action: 'view_financial_settings' }
  }
);

// PUT - Atualizar configurações financeiras
export const PUT = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const supabase = await createServerSupabaseClient();

      const body = await request.json();

      // Validar dados de entrada
      const validation = validateConfiguracao(body, false);
      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Dados inválidos',
            details: validation.errors
          },
          { status: 400 }
        );
      }

      // Buscar configuração existente para audit trail
      const { data: configuracaoExistente, error: fetchError } = await supabase
        .from('configuracoes_financeiras')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Erro ao buscar configuração existente:', fetchError);
        return NextResponse.json(
          { error: 'Erro interno do servidor' },
          { status: 500 }
        );
      }

      let resultado;
      let oldValues = null;

      if (!configuracaoExistente || configuracaoExistente.length === 0) {
        // Criar nova configuração se não existir
        const novaConfiguracao: CreateConfiguracaoData = {
          taxa_juros_mensal: body.taxa_juros_mensal,
          taxa_multa: body.taxa_multa,
          taxa_comissao: body.taxa_comissao,
          dias_carencia: body.dias_carencia,
          user_id: user.id
        };

        const { data, error } = await supabase
          .from('configuracoes_financeiras')
          .insert([novaConfiguracao])
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar configuração:', error);
          return NextResponse.json(
            { error: 'Erro ao criar configuração' },
            { status: 500 }
          );
        }

        resultado = data;

        // Log audit trail for configuration creation
        await logFinancialAudit(
          'configuracao_create',
          'create',
          auditData,
          {
            entityType: 'configuracao',
            entityId: resultado.id,
            newValues: novaConfiguracao
          }
        );
      } else {
        // Store old values for audit trail
        oldValues = {
          taxa_juros_mensal: configuracaoExistente[0].taxa_juros_mensal,
          taxa_multa: configuracaoExistente[0].taxa_multa,
          taxa_comissao: configuracaoExistente[0].taxa_comissao,
          dias_carencia: configuracaoExistente[0].dias_carencia
        };

        // Atualizar configuração existente
        const updateData: Partial<UpdateConfiguracaoData> = {
          taxa_juros_mensal: body.taxa_juros_mensal,
          taxa_multa: body.taxa_multa,
          taxa_comissao: body.taxa_comissao,
          dias_carencia: body.dias_carencia
        };

        const { data, error } = await supabase
          .from('configuracoes_financeiras')
          .update(updateData)
          .eq('id', configuracaoExistente[0].id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar configuração:', error);
          return NextResponse.json(
            { error: 'Erro ao atualizar configuração' },
            { status: 500 }
          );
        }

        resultado = data;

        // Log audit trail for configuration update
        await logFinancialAudit(
          'configuracao_update',
          'update',
          auditData,
          {
            entityType: 'configuracao',
            entityId: resultado.id,
            oldValues,
            newValues: {
              taxa_juros_mensal: body.taxa_juros_mensal,
              taxa_multa: body.taxa_multa,
              taxa_comissao: body.taxa_comissao,
              dias_carencia: body.dias_carencia
            }
          }
        );
      }

      return NextResponse.json(resultado);
    } catch (error) {
      console.error('Erro na API de configurações:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    requiredPermission: 'financial.settings.edit',
    operation: 'update_configuracoes',
    sensitiveData: true,
    auditDetails: { action: 'update_financial_settings' }
  }
);