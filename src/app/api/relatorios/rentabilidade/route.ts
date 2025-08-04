import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { RelatorioRentabilidade, PAGAMENTO_STATUS, DESPESA_STATUS } from '@/types/financeiro'
import { CalculoFinanceiroService } from '@/lib/services/calculoFinanceiro'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

// GET /api/relatorios/rentabilidade - Relatório de rentabilidade por imóvel
export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const { searchParams } = new URL(request.url)
    
    // Parâmetros de período
    const dataInicio = searchParams.get('data_inicio') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0] // Início do ano
    const dataFim = searchParams.get('data_fim') || new Date().toISOString().split('T')[0]
    const imovelId = searchParams.get('imovel_id') // Filtro opcional por imóvel específico
    const formato = searchParams.get('formato') || 'json' // json, pdf, excel
    const ordenacao = searchParams.get('ordenacao') || 'rentabilidade' // rentabilidade, receita, ocupacao

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

    // Calcular número de meses no período
    const mesesPeriodo = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30))

    // Buscar imóveis (filtrar por ID se especificado)
    let imoveisQuery = supabase
      .from('imoveis')
      .select(`
        id,
        endereco,
        cidade,
        tipo,
        valor_aluguel,
        status,
        area_total,
        quartos,
        banheiros
      `)
      .order('endereco', { ascending: true })

    if (imovelId) {
      imoveisQuery = imoveisQuery.eq('id', imovelId)
    }

    const { data: imoveis, error: imoveisError } = await imoveisQuery

    if (imoveisError) {
      console.error('Erro ao buscar imóveis:', imoveisError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de imóveis' },
        { status: 500 }
      )
    }

    if (!imoveis || imoveis.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          por_imovel: [],
          resumo: {
            receita_bruta_total: 0,
            despesas_total: 0,
            receita_liquida_total: 0,
            rentabilidade_media: 0,
            ocupacao_media: 0
          }
        }
      })
    }

    // Buscar pagamentos do período para todos os imóveis
    const { data: pagamentos, error: pagamentosError } = await supabase
      .from('pagamentos_aluguel')
      .select(`
        *,
        contrato:contratos_aluguel(
          id,
          imovel_id,
          valor_aluguel
        )
      `)
      .gte('mes_referencia', dataInicio)
      .lte('mes_referencia', dataFim)
      .in('contrato.imovel_id', imoveis.map(i => i.id))

    if (pagamentosError) {
      console.error('Erro ao buscar pagamentos:', pagamentosError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de pagamentos' },
        { status: 500 }
      )
    }

    // Buscar despesas do período para todos os imóveis
    const { data: despesas, error: despesasError } = await supabase
      .from('despesas_imoveis')
      .select('*')
      .gte('data_despesa', dataInicio)
      .lte('data_despesa', dataFim)
      .in('imovel_id', imoveis.map(i => i.id))

    if (despesasError) {
      console.error('Erro ao buscar despesas:', despesasError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de despesas' },
        { status: 500 }
      )
    }

    // Calcular rentabilidade por imóvel
    const rentabilidadePorImovel = imoveis.map(imovel => {
      // Filtrar pagamentos deste imóvel
      const pagamentosImovel = (pagamentos || []).filter(p => 
        p.contrato?.imovel_id === imovel.id
      )

      // Filtrar despesas deste imóvel
      const despesasImovel = (despesas || []).filter(d => 
        d.imovel_id === imovel.id
      )

      // Calcular receita bruta (pagamentos pagos)
      const pagamentosPagos = pagamentosImovel.filter(p => p.status === PAGAMENTO_STATUS.PAGO)
      const receitaBruta = pagamentosPagos.reduce((acc, p) => acc + (p.valor_pago || 0), 0)

      // Calcular despesas (despesas pagas)
      const despesasPagas = despesasImovel.filter(d => d.status === DESPESA_STATUS.PAGO)
      const despesasTotal = despesasPagas.reduce((acc, d) => acc + d.valor, 0)

      // Calcular receita líquida
      const receitaLiquida = receitaBruta - despesasTotal

      // Calcular rentabilidade percentual
      const rentabilidadePercentual = receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0

      // Calcular ocupação (meses com pagamento / total de meses)
      const mesesComPagamento = new Set(
        pagamentosPagos.map(p => p.mes_referencia)
      ).size
      const ocupacaoPercentual = mesesPeriodo > 0 ? (mesesComPagamento / mesesPeriodo) * 100 : 0

      return {
        imovel,
        receita_bruta: Math.round(receitaBruta * 100) / 100,
        despesas_total: Math.round(despesasTotal * 100) / 100,
        receita_liquida: Math.round(receitaLiquida * 100) / 100,
        rentabilidade_percentual: Math.round(rentabilidadePercentual * 100) / 100,
        ocupacao_percentual: Math.round(ocupacaoPercentual * 100) / 100
      }
    })

    // Aplicar ordenação
    switch (ordenacao) {
      case 'receita':
        rentabilidadePorImovel.sort((a, b) => b.receita_bruta - a.receita_bruta)
        break
      case 'ocupacao':
        rentabilidadePorImovel.sort((a, b) => b.ocupacao_percentual - a.ocupacao_percentual)
        break
      case 'rentabilidade':
      default:
        rentabilidadePorImovel.sort((a, b) => b.rentabilidade_percentual - a.rentabilidade_percentual)
        break
    }

    // Calcular resumo geral
    const receitaBrutaTotal = rentabilidadePorImovel.reduce((acc, item) => acc + item.receita_bruta, 0)
    const despesasTotalGeral = rentabilidadePorImovel.reduce((acc, item) => acc + item.despesas_total, 0)
    const receitaLiquidaTotal = receitaBrutaTotal - despesasTotalGeral
    const rentabilidadeMedia = rentabilidadePorImovel.length > 0 
      ? rentabilidadePorImovel.reduce((acc, item) => acc + item.rentabilidade_percentual, 0) / rentabilidadePorImovel.length 
      : 0
    const ocupacaoMedia = rentabilidadePorImovel.length > 0 
      ? rentabilidadePorImovel.reduce((acc, item) => acc + item.ocupacao_percentual, 0) / rentabilidadePorImovel.length 
      : 0

    const relatorio: RelatorioRentabilidade = {
      por_imovel: rentabilidadePorImovel,
      resumo: {
        receita_bruta_total: Math.round(receitaBrutaTotal * 100) / 100,
        despesas_total: Math.round(despesasTotalGeral * 100) / 100,
        receita_liquida_total: Math.round(receitaLiquidaTotal * 100) / 100,
        rentabilidade_media: Math.round(rentabilidadeMedia * 100) / 100,
        ocupacao_media: Math.round(ocupacaoMedia * 100) / 100
      }
    }

    // Log audit trail for rentabilidade report access
    await logFinancialAudit(
      'relatorio_rentabilidade',
      'view',
      auditData,
      {
        entityType: 'relatorio_rentabilidade',
        affectedRecords: rentabilidadePorImovel.length,
        newValues: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          imovel_id: imovelId,
          formato,
          ordenacao,
          meses_periodo: mesesPeriodo,
          receita_bruta_total: relatorio.resumo.receita_bruta_total,
          receita_liquida_total: relatorio.resumo.receita_liquida_total,
          rentabilidade_media: relatorio.resumo.rentabilidade_media
        }
      }
    );

    // Se formato for PDF ou Excel, incluir dados adicionais
    if (formato === 'pdf' || formato === 'excel') {
      return NextResponse.json({
        success: true,
        data: relatorio,
        formato,
        parametros: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          imovel_id: imovelId,
          ordenacao,
          meses_periodo: mesesPeriodo
        },
        detalhes: {
          pagamentos: pagamentos || [],
          despesas: despesas || []
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: relatorio
    })
  } catch (error) {
    console.error('Erro ao gerar relatório de rentabilidade:', error)
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
  operation: 'generate_rentabilidade_report',
  auditDetails: { action: 'generate_rentabilidade_report' }
}
);