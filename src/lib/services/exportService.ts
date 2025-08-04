import { RelatorioFinanceiro, RelatorioInadimplencia, RelatorioRentabilidade } from '@/types/financeiro'

/**
 * Serviço para exportação de relatórios em diferentes formatos
 */
export class ExportService {
  /**
   * Gera dados para exportação em PDF do relatório financeiro
   */
  static gerarDadosPDFFinanceiro(relatorio: RelatorioFinanceiro, detalhes?: any): any {
    return {
      titulo: 'Relatório Financeiro',
      periodo: `${this.formatarData(relatorio.periodo.inicio)} a ${this.formatarData(relatorio.periodo.fim)}`,
      secoes: [
        {
          titulo: 'Receitas',
          dados: [
            { label: 'Total de Receitas', valor: this.formatarMoeda(relatorio.receitas.total) },
            { label: 'Pagamentos do Mês', valor: this.formatarMoeda(relatorio.receitas.pagamentos_mes) },
            { label: 'Pagamentos Atrasados', valor: this.formatarMoeda(relatorio.receitas.pagamentos_atrasados) }
          ]
        },
        {
          titulo: 'Despesas',
          dados: [
            { label: 'Total de Despesas', valor: this.formatarMoeda(relatorio.despesas.total) },
            ...Object.entries(relatorio.despesas.por_categoria).map(([categoria, valor]) => ({
              label: this.formatarCategoriaDespesa(categoria),
              valor: this.formatarMoeda(valor)
            }))
          ]
        },
        {
          titulo: 'Inadimplência',
          dados: [
            { label: 'Valor Total em Atraso', valor: this.formatarMoeda(relatorio.inadimplencia.total_atrasado) },
            { label: 'Contratos em Atraso', valor: relatorio.inadimplencia.quantidade_contratos.toString() },
            { label: 'Percentual de Inadimplência', valor: `${relatorio.inadimplencia.percentual}%` }
          ]
        },
        {
          titulo: 'Rentabilidade',
          dados: [
            { label: 'Rentabilidade Bruta', valor: this.formatarMoeda(relatorio.rentabilidade.bruta) },
            { label: 'Rentabilidade Líquida', valor: this.formatarMoeda(relatorio.rentabilidade.liquida) },
            { label: 'Margem de Rentabilidade', valor: `${relatorio.rentabilidade.margem}%` }
          ]
        }
      ]
    }
  }

  /**
   * Gera dados para exportação em Excel do relatório financeiro
   */
  static gerarDadosExcelFinanceiro(relatorio: RelatorioFinanceiro, detalhes?: any): any {
    const planilhas = [
      {
        nome: 'Resumo',
        dados: [
          ['Período', `${relatorio.periodo.inicio} a ${relatorio.periodo.fim}`],
          [''],
          ['RECEITAS'],
          ['Total de Receitas', relatorio.receitas.total],
          ['Pagamentos do Mês', relatorio.receitas.pagamentos_mes],
          ['Pagamentos Atrasados', relatorio.receitas.pagamentos_atrasados],
          [''],
          ['DESPESAS'],
          ['Total de Despesas', relatorio.despesas.total],
          ...Object.entries(relatorio.despesas.por_categoria).map(([categoria, valor]) => [
            this.formatarCategoriaDespesa(categoria),
            valor
          ]),
          [''],
          ['INADIMPLÊNCIA'],
          ['Valor Total em Atraso', relatorio.inadimplencia.total_atrasado],
          ['Contratos em Atraso', relatorio.inadimplencia.quantidade_contratos],
          ['Percentual de Inadimplência (%)', relatorio.inadimplencia.percentual],
          [''],
          ['RENTABILIDADE'],
          ['Rentabilidade Bruta', relatorio.rentabilidade.bruta],
          ['Rentabilidade Líquida', relatorio.rentabilidade.liquida],
          ['Margem de Rentabilidade (%)', relatorio.rentabilidade.margem]
        ]
      }
    ]

    // Adicionar planilha de detalhes se disponível
    if (detalhes?.pagamentos) {
      planilhas.push({
        nome: 'Pagamentos',
        dados: [
          ['ID', 'Contrato', 'Mês Referência', 'Valor Devido', 'Valor Pago', 'Data Vencimento', 'Data Pagamento', 'Status'],
          ...detalhes.pagamentos.map((p: any) => [
            p.id,
            p.contrato_id,
            p.mes_referencia,
            p.valor_devido,
            p.valor_pago || 0,
            p.data_vencimento,
            p.data_pagamento || '',
            p.status
          ])
        ]
      })
    }

    if (detalhes?.despesas) {
      planilhas.push({
        nome: 'Despesas',
        dados: [
          ['ID', 'Imóvel', 'Categoria', 'Descrição', 'Valor', 'Data Despesa', 'Status'],
          ...detalhes.despesas.map((d: any) => [
            d.id,
            d.imovel_id,
            d.categoria,
            d.descricao,
            d.valor,
            d.data_despesa,
            d.status
          ])
        ]
      })
    }

    return { planilhas }
  }

  /**
   * Gera dados para exportação em PDF do relatório de inadimplência
   */
  static gerarDadosPDFInadimplencia(relatorio: RelatorioInadimplencia, parametros?: any): any {
    return {
      titulo: 'Relatório de Inadimplência',
      dataCorte: parametros?.data_corte ? this.formatarData(parametros.data_corte) : 'Não informada',
      secoes: [
        {
          titulo: 'Resumo',
          dados: [
            { label: 'Total de Contratos em Atraso', valor: relatorio.resumo.total_contratos_atrasados.toString() },
            { label: 'Valor Total em Atraso', valor: this.formatarMoeda(relatorio.resumo.valor_total_atrasado) },
            { label: 'Média de Dias em Atraso', valor: `${relatorio.resumo.media_dias_atraso} dias` }
          ]
        },
        {
          titulo: 'Contratos em Atraso',
          tabela: {
            cabecalho: ['Inquilino', 'Imóvel', 'Dias Atraso', 'Valor Devido', 'Pagamentos Pendentes'],
            linhas: relatorio.contratos_atrasados.map(item => [
              item.contrato?.inquilino?.nome || 'N/A',
              item.contrato?.imovel?.endereco || 'N/A',
              `${item.dias_atraso} dias`,
              this.formatarMoeda(item.valor_total_devido),
              item.pagamentos_pendentes.length.toString()
            ])
          }
        }
      ]
    }
  }

  /**
   * Gera dados para exportação em Excel do relatório de inadimplência
   */
  static gerarDadosExcelInadimplencia(relatorio: RelatorioInadimplencia, parametros?: any): any {
    const planilhas = [
      {
        nome: 'Resumo',
        dados: [
          ['Data de Corte', parametros?.data_corte || 'Não informada'],
          ['Dias Mínimos de Atraso', parametros?.dias_minimos || 1],
          [''],
          ['RESUMO GERAL'],
          ['Total de Contratos em Atraso', relatorio.resumo.total_contratos_atrasados],
          ['Valor Total em Atraso', relatorio.resumo.valor_total_atrasado],
          ['Média de Dias em Atraso', relatorio.resumo.media_dias_atraso]
        ]
      },
      {
        nome: 'Contratos em Atraso',
        dados: [
          [
            'Contrato ID',
            'Inquilino',
            'CPF/CNPJ',
            'Telefone',
            'Email',
            'Imóvel',
            'Cidade',
            'Valor Aluguel',
            'Dias Atraso',
            'Valor Total Devido',
            'Pagamentos Pendentes'
          ],
          ...relatorio.contratos_atrasados.map(item => [
            item.contrato?.id || '',
            item.contrato?.inquilino?.nome || '',
            item.contrato?.inquilino?.cpf_cnpj || '',
            item.contrato?.inquilino?.telefone || '',
            item.contrato?.inquilino?.email || '',
            item.contrato?.imovel?.endereco || '',
            item.contrato?.imovel?.cidade || '',
            item.contrato?.valor_aluguel || 0,
            item.dias_atraso,
            item.valor_total_devido,
            item.pagamentos_pendentes.length
          ])
        ]
      }
    ]

    // Adicionar planilha detalhada de pagamentos pendentes
    if (relatorio.contratos_atrasados.length > 0) {
      const pagamentosDetalhados = []
      pagamentosDetalhados.push([
        'Contrato ID',
        'Inquilino',
        'Mês Referência',
        'Data Vencimento',
        'Valor Devido',
        'Valor Juros',
        'Valor Multa',
        'Total',
        'Dias Atraso'
      ])

      relatorio.contratos_atrasados.forEach(item => {
        item.pagamentos_pendentes.forEach(pagamento => {
          const dataVencimento = new Date(pagamento.data_vencimento)
          const hoje = new Date()
          const diasAtraso = Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24))
          
          pagamentosDetalhados.push([
            item.contrato?.id || '',
            item.contrato?.inquilino?.nome || '',
            pagamento.mes_referencia,
            pagamento.data_vencimento,
            pagamento.valor_devido,
            pagamento.valor_juros,
            pagamento.valor_multa,
            pagamento.valor_devido + pagamento.valor_juros + pagamento.valor_multa,
            diasAtraso
          ])
        })
      })

      planilhas.push({
        nome: 'Pagamentos Pendentes',
        dados: pagamentosDetalhados
      })
    }

    return { planilhas }
  }

  /**
   * Gera dados para exportação em PDF do relatório de rentabilidade
   */
  static gerarDadosPDFRentabilidade(relatorio: RelatorioRentabilidade, parametros?: any): any {
    return {
      titulo: 'Relatório de Rentabilidade',
      periodo: parametros?.data_inicio && parametros?.data_fim 
        ? `${this.formatarData(parametros.data_inicio)} a ${this.formatarData(parametros.data_fim)}`
        : 'Período não informado',
      secoes: [
        {
          titulo: 'Resumo Geral',
          dados: [
            { label: 'Receita Bruta Total', valor: this.formatarMoeda(relatorio.resumo.receita_bruta_total) },
            { label: 'Despesas Total', valor: this.formatarMoeda(relatorio.resumo.despesas_total) },
            { label: 'Receita Líquida Total', valor: this.formatarMoeda(relatorio.resumo.receita_liquida_total) },
            { label: 'Rentabilidade Média', valor: `${relatorio.resumo.rentabilidade_media}%` },
            { label: 'Ocupação Média', valor: `${relatorio.resumo.ocupacao_media}%` }
          ]
        },
        {
          titulo: 'Rentabilidade por Imóvel',
          tabela: {
            cabecalho: ['Imóvel', 'Receita Bruta', 'Despesas', 'Receita Líquida', 'Rentabilidade %', 'Ocupação %'],
            linhas: relatorio.por_imovel.map(item => [
              item.imovel?.endereco || 'N/A',
              this.formatarMoeda(item.receita_bruta),
              this.formatarMoeda(item.despesas_total),
              this.formatarMoeda(item.receita_liquida),
              `${item.rentabilidade_percentual}%`,
              `${item.ocupacao_percentual}%`
            ])
          }
        }
      ]
    }
  }

  /**
   * Gera dados para exportação em Excel do relatório de rentabilidade
   */
  static gerarDadosExcelRentabilidade(relatorio: RelatorioRentabilidade, parametros?: any): any {
    const planilhas = [
      {
        nome: 'Resumo',
        dados: [
          ['Período', parametros?.data_inicio && parametros?.data_fim 
            ? `${parametros.data_inicio} a ${parametros.data_fim}`
            : 'Não informado'],
          ['Meses no Período', parametros?.meses_periodo || 'N/A'],
          [''],
          ['RESUMO GERAL'],
          ['Receita Bruta Total', relatorio.resumo.receita_bruta_total],
          ['Despesas Total', relatorio.resumo.despesas_total],
          ['Receita Líquida Total', relatorio.resumo.receita_liquida_total],
          ['Rentabilidade Média (%)', relatorio.resumo.rentabilidade_media],
          ['Ocupação Média (%)', relatorio.resumo.ocupacao_media]
        ]
      },
      {
        nome: 'Por Imóvel',
        dados: [
          [
            'Imóvel ID',
            'Endereço',
            'Cidade',
            'Tipo',
            'Valor Aluguel',
            'Receita Bruta',
            'Despesas Total',
            'Receita Líquida',
            'Rentabilidade %',
            'Ocupação %'
          ],
          ...relatorio.por_imovel.map(item => [
            item.imovel?.id || '',
            item.imovel?.endereco || '',
            item.imovel?.cidade || '',
            item.imovel?.tipo || '',
            item.imovel?.valor_aluguel || 0,
            item.receita_bruta,
            item.despesas_total,
            item.receita_liquida,
            item.rentabilidade_percentual,
            item.ocupacao_percentual
          ])
        ]
      }
    ]

    return { planilhas }
  }

  /**
   * Formata valor monetário para exibição
   */
  private static formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  /**
   * Formata data para exibição
   */
  private static formatarData(data: string): string {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  /**
   * Formata categoria de despesa para exibição
   */
  private static formatarCategoriaDespesa(categoria: string): string {
    const categorias: Record<string, string> = {
      'manutencao': 'Manutenção',
      'impostos': 'Impostos',
      'seguros': 'Seguros',
      'administracao': 'Administração',
      'outros': 'Outros'
    }
    return categorias[categoria] || categoria
  }

  /**
   * Gera nome de arquivo para exportação
   */
  static gerarNomeArquivo(tipo: 'financeiro' | 'inadimplencia' | 'rentabilidade', formato: 'pdf' | 'excel', dataInicio?: string, dataFim?: string): string {
    const agora = new Date()
    const timestamp = agora.toISOString().slice(0, 10).replace(/-/g, '')
    
    let nome = `relatorio-${tipo}-${timestamp}`
    
    if (dataInicio && dataFim) {
      const inicio = dataInicio.replace(/-/g, '')
      const fim = dataFim.replace(/-/g, '')
      nome = `relatorio-${tipo}-${inicio}-${fim}`
    }
    
    const extensao = formato === 'pdf' ? 'pdf' : 'xlsx'
    return `${nome}.${extensao}`
  }
}