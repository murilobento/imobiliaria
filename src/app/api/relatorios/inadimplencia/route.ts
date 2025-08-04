import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { RelatorioInadimplencia, PAGAMENTO_STATUS } from '@/types/financeiro'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

// GET /api/relatorios/inadimplencia - Relatório de inadimplência
export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const { searchParams } = new URL(request.url)
    
    // Parâmetros opcionais
    const dataCorte = searchParams.get('data_corte') || new Date().toISOString().split('T')[0]
    const diasMinimos = parseInt(searchParams.get('dias_minimos') || '1')
    const formato = searchParams.get('formato') || 'json' // json, pdf, excel
    const ordenacao = searchParams.get('ordenacao') || 'dias_atraso' // dias_atraso, valor_devido, contrato

    // Buscar pagamentos em atraso
    const { data: pagamentosAtrasados, error: pagamentosError } = await supabase
      .from('pagamentos_aluguel')
      .select(`
        *,
        contrato:contratos_aluguel(
          id,
          valor_aluguel,
          data_inicio,
          data_fim,
          dia_vencimento,
          imovel:imoveis(
            id,
            endereco,
            cidade,
            tipo,
            valor_aluguel
          ),
          inquilino:clientes!contratos_aluguel_inquilino_id_fkey(
            id,
            nome,
            email,
            telefone,
            cpf_cnpj
          ),
          proprietario:clientes!contratos_aluguel_proprietario_id_fkey(
            id,
            nome,
            email,
            telefone
          )
        )
      `)
      .eq('status', PAGAMENTO_STATUS.ATRASADO)
      .lte('data_vencimento', dataCorte)
      .order('data_vencimento', { ascending: true })

    if (pagamentosError) {
      console.error('Erro ao buscar pagamentos em atraso:', pagamentosError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados de inadimplência' },
        { status: 500 }
      )
    }

    // Agrupar pagamentos por contrato
    const contratosAtrasados = new Map()
    const dataCorteObj = new Date(dataCorte)

    for (const pagamento of pagamentosAtrasados || []) {
      const contratoId = pagamento.contrato_id
      const dataVencimento = new Date(pagamento.data_vencimento)
      const diasAtraso = Math.floor((dataCorteObj.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24))

      // Filtrar por dias mínimos de atraso
      if (diasAtraso < diasMinimos) {
        continue
      }

      if (!contratosAtrasados.has(contratoId)) {
        contratosAtrasados.set(contratoId, {
          contrato: pagamento.contrato,
          pagamentos_pendentes: [],
          valor_total_devido: 0,
          dias_atraso: 0
        })
      }

      const contratoData = contratosAtrasados.get(contratoId)
      contratoData.pagamentos_pendentes.push(pagamento)
      contratoData.valor_total_devido += pagamento.valor_devido + pagamento.valor_juros + pagamento.valor_multa
      contratoData.dias_atraso = Math.max(contratoData.dias_atraso, diasAtraso)
    }

    // Converter Map para Array e ordenar
    let contratosAtrasadosArray = Array.from(contratosAtrasados.values())

    // Aplicar ordenação
    switch (ordenacao) {
      case 'valor_devido':
        contratosAtrasadosArray.sort((a, b) => b.valor_total_devido - a.valor_total_devido)
        break
      case 'contrato':
        contratosAtrasadosArray.sort((a, b) => {
          const nomeA = a.contrato?.inquilino?.nome || ''
          const nomeB = b.contrato?.inquilino?.nome || ''
          return nomeA.localeCompare(nomeB)
        })
        break
      case 'dias_atraso':
      default:
        contratosAtrasadosArray.sort((a, b) => b.dias_atraso - a.dias_atraso)
        break
    }

    // Calcular resumo
    const totalContratosAtrasados = contratosAtrasadosArray.length
    const valorTotalAtrasado = contratosAtrasadosArray.reduce((acc, item) => acc + item.valor_total_devido, 0)
    const mediaDiasAtraso = totalContratosAtrasados > 0 
      ? contratosAtrasadosArray.reduce((acc, item) => acc + item.dias_atraso, 0) / totalContratosAtrasados 
      : 0

    // Arredondar valores para 2 casas decimais
    contratosAtrasadosArray = contratosAtrasadosArray.map(item => ({
      ...item,
      valor_total_devido: Math.round(item.valor_total_devido * 100) / 100,
      pagamentos_pendentes: item.pagamentos_pendentes.map((p: any) => ({
        ...p,
        valor_devido: Math.round(p.valor_devido * 100) / 100,
        valor_juros: Math.round(p.valor_juros * 100) / 100,
        valor_multa: Math.round(p.valor_multa * 100) / 100
      }))
    }))

    const relatorio: RelatorioInadimplencia = {
      contratos_atrasados: contratosAtrasadosArray,
      resumo: {
        total_contratos_atrasados: totalContratosAtrasados,
        valor_total_atrasado: Math.round(valorTotalAtrasado * 100) / 100,
        media_dias_atraso: Math.round(mediaDiasAtraso * 100) / 100
      }
    }

    // Log audit trail for inadimplencia report access
    await logFinancialAudit(
      'relatorio_inadimplencia',
      'view',
      auditData,
      {
        entityType: 'relatorio_inadimplencia',
        affectedRecords: totalContratosAtrasados,
        newValues: {
          data_corte: dataCorte,
          dias_minimos: diasMinimos,
          formato,
          ordenacao,
          total_contratos_atrasados: totalContratosAtrasados,
          valor_total_atrasado: relatorio.resumo.valor_total_atrasado
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
          data_corte: dataCorte,
          dias_minimos: diasMinimos,
          ordenacao
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: relatorio
    })
  } catch (error) {
    console.error('Erro ao gerar relatório de inadimplência:', error)
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
  operation: 'generate_inadimplencia_report',
  auditDetails: { action: 'generate_inadimplencia_report' }
}
);