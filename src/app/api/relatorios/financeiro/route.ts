import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { RelatorioFinanceiro, PAGAMENTO_STATUS, DESPESA_STATUS } from '@/types/financeiro'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

// GET /api/relatorios/financeiro - Relatório financeiro mensal
export const GET = withFinancialSecurity(
  async (request: NextRequest, _user: any, auditData: any) => {
    try {
      const supabase = await createServerSupabaseClient()
      const { searchParams } = new URL(request.url)
    
    // Parâmetros de período
    const dataInicio = searchParams.get('data_inicio') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const dataFim = searchParams.get('data_fim') || new Date().toISOString().split('T')[0]
    const formato = searchParams.get('formato') || 'json' // json, pdf, excel

    // Validar datas
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    
    if (fim <= inicio) {
      return NextResponse.json(
        { 
          error: 'Datas inválidas',
          message: 'A data de fim deve ser posterior à data de início'
        },
        { status: 400 }
      )
    }

    // Buscar pagamentos do período
    const { data: pagamentos, error: pagamentosError } = await supabase
      .from('pagamentos_aluguel')
      .select(`
        *,
        contrato:contratos_aluguel(
          id,
          valor_aluguel,
          imovel:imoveis(id, endereco, cidade)
        )
      `)
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .order('data_vencimento', { ascending: true })

    if (pagamentosError) {
      console.error('Erro ao buscar pagamentos:', pagamentosError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de pagamentos' },
        { status: 500 }
      )
    }

    // Buscar despesas do período
    const { data: despesas, error: despesasError } = await supabase
      .from('despesas_imoveis')
      .select(`
        *,
        imovel:imoveis(id, endereco, cidade)
      `)
      .gte('data_despesa', dataInicio)
      .lte('data_despesa', dataFim)
      .order('data_despesa', { ascending: true })

    if (despesasError) {
      console.error('Erro ao buscar despesas:', despesasError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de despesas' },
        { status: 500 }
      )
    }

    // Buscar contratos ativos para calcular inadimplência
    const { data: contratos, error: contratosError } = await supabase
      .from('contratos_aluguel')
      .select('id, valor_aluguel')
      .eq('status', 'ativo')

    if (contratosError) {
      console.error('Erro ao buscar contratos:', contratosError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de contratos' },
        { status: 500 }
      )
    }

    // Calcular receitas
    const pagamentosPagos = pagamentos?.filter((p: any) => p.status === PAGAMENTO_STATUS.PAGO) || []
    const pagamentosAtrasados = pagamentos?.filter((p: any) => p.status === PAGAMENTO_STATUS.ATRASADO) || []
    
    const receitasPagamentosMes = pagamentosPagos
      .filter((p: any) => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim)
      .reduce((acc: number, p: any) => acc + (p.valor_pago || 0), 0)
    
    const receitasPagamentosAtrasados = pagamentosAtrasados
      .reduce((acc: number, p: any) => acc + (p.valor_pago || 0), 0)
    
    const receitasTotal = receitasPagamentosMes + receitasPagamentosAtrasados

    // Calcular despesas por categoria
    const despesasPorCategoria = (despesas || []).reduce((acc: Record<string, number>, despesa: any) => {
      if (despesa.status === DESPESA_STATUS.PAGO) {
        acc[despesa.categoria] = (acc[despesa.categoria] || 0) + despesa.valor
      }
      return acc
    }, {} as Record<string, number>)

    const despesasTotal = Object.values(despesasPorCategoria).reduce((acc: number, valor: number) => acc + valor, 0)

    // Calcular inadimplência
    const pagamentosAtrasadosValor = pagamentosAtrasados.reduce((acc: number, p: any) => acc + p.valor_devido + p.valor_juros + p.valor_multa, 0)
    const contratosAtrasados = new Set(pagamentosAtrasados.map((p: any) => p.contrato_id)).size
    const totalContratos = contratos?.length || 0
    const percentualInadimplencia = totalContratos > 0 ? (contratosAtrasados / totalContratos) * 100 : 0

    // Calcular rentabilidade
    const rentabilidadeBruta = receitasTotal
    const rentabilidadeLiquida = receitasTotal - despesasTotal
    const margemRentabilidade = receitasTotal > 0 ? (rentabilidadeLiquida / receitasTotal) * 100 : 0

    const relatorio: RelatorioFinanceiro = {
      periodo: {
        inicio: dataInicio,
        fim: dataFim
      },
      receitas: {
        total: Math.round(receitasTotal * 100) / 100,
        pagamentos_mes: Math.round(receitasPagamentosMes * 100) / 100,
        pagamentos_atrasados: Math.round(receitasPagamentosAtrasados * 100) / 100
      },
      despesas: {
        total: Math.round(despesasTotal * 100) / 100,
        por_categoria: Object.fromEntries(
          Object.entries(despesasPorCategoria).map(([cat, val]: [string, number]) => [cat, Math.round(val * 100) / 100])
        ) as Record<string, number>
      },
      inadimplencia: {
        total_atrasado: Math.round(pagamentosAtrasadosValor * 100) / 100,
        quantidade_contratos: contratosAtrasados,
        percentual: Math.round(percentualInadimplencia * 100) / 100
      },
      rentabilidade: {
        bruta: Math.round(rentabilidadeBruta * 100) / 100,
        liquida: Math.round(rentabilidadeLiquida * 100) / 100,
        margem: Math.round(margemRentabilidade * 100) / 100
      }
    }

    // Se formato for PDF ou Excel, retornar dados para processamento
    if (formato === 'pdf' || formato === 'excel') {
      return NextResponse.json({
        success: true,
        data: relatorio,
        formato,
        detalhes: {
          pagamentos: pagamentos || [],
          despesas: despesas || []
        }
      })
    }

    // Log audit trail for financial report access
    await logFinancialAudit(
      'relatorio_financeiro',
      'view',
      auditData,
      {
        entityType: 'relatorio_financeiro',
        newValues: {
          periodo: { inicio: dataInicio, fim: dataFim },
          formato,
          receita_total: relatorio.receitas.total,
          despesa_total: relatorio.despesas.total,
          rentabilidade_liquida: relatorio.rentabilidade.liquida
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: relatorio
    })
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado ao gerar o relatório'
      },
      { status: 500 }
    )
  }
  },
  {
    requiredPermission: 'financial.reports.view',
    operation: 'generate_financial_report',
    auditDetails: { action: 'generate_financial_report' }
  }
);