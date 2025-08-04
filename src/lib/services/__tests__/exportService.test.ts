import { describe, it, expect } from 'vitest'
import { ExportService } from '../exportService'
import { RelatorioFinanceiro, RelatorioInadimplencia, RelatorioRentabilidade } from '@/types/financeiro'

describe('ExportService', () => {
  const mockRelatorioFinanceiro: RelatorioFinanceiro = {
    periodo: {
      inicio: '2024-01-01',
      fim: '2024-01-31'
    },
    receitas: {
      total: 5000,
      pagamentos_mes: 4000,
      pagamentos_atrasados: 1000
    },
    despesas: {
      total: 1500,
      por_categoria: {
        manutencao: 800,
        impostos: 400,
        seguros: 200,
        administracao: 100,
        outros: 0
      }
    },
    inadimplencia: {
      total_atrasado: 2000,
      quantidade_contratos: 2,
      percentual: 20
    },
    rentabilidade: {
      bruta: 5000,
      liquida: 3500,
      margem: 70
    }
  }

  const mockRelatorioInadimplencia: RelatorioInadimplencia = {
    contratos_atrasados: [
      {
        contrato: {
          id: 'c1',
          imovel_id: 'i1',
          inquilino_id: 'cl1',
          valor_aluguel: 2000,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo',
          inquilino: {
            id: 'cl1',
            nome: 'João Silva',
            email: 'joao@test.com',
            telefone: '11999999999',
            cpf_cnpj: '12345678901',
            tipo: 'pessoa_fisica'
          },
          imovel: {
            id: 'i1',
            endereco: 'Rua A, 123',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01234-567',
            tipo: 'apartamento',
            valor_aluguel: 2000,
            area_total: 80,
            quartos: 2,
            banheiros: 1,
            status: 'alugado'
          }
        },
        pagamentos_pendentes: [
          {
            id: 'p1',
            contrato_id: 'c1',
            mes_referencia: '2024-01-01',
            valor_devido: 2000,
            data_vencimento: '2024-01-10',
            valor_juros: 60,
            valor_multa: 40,
            status: 'atrasado'
          }
        ],
        valor_total_devido: 2100,
        dias_atraso: 30
      }
    ],
    resumo: {
      total_contratos_atrasados: 1,
      valor_total_atrasado: 2100,
      media_dias_atraso: 30
    }
  }

  const mockRelatorioRentabilidade: RelatorioRentabilidade = {
    por_imovel: [
      {
        imovel: {
          id: 'i1',
          endereco: 'Rua A, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567',
          tipo: 'apartamento',
          valor_aluguel: 2000,
          area_total: 80,
          quartos: 2,
          banheiros: 1,
          status: 'alugado'
        },
        receita_bruta: 4000,
        despesas_total: 500,
        receita_liquida: 3500,
        rentabilidade_percentual: 87.5,
        ocupacao_percentual: 100
      }
    ],
    resumo: {
      receita_bruta_total: 4000,
      despesas_total: 500,
      receita_liquida_total: 3500,
      rentabilidade_media: 87.5,
      ocupacao_media: 100
    }
  }

  describe('gerarDadosPDFFinanceiro', () => {
    it('deve gerar dados corretos para PDF do relatório financeiro', () => {
      const dados = ExportService.gerarDadosPDFFinanceiro(mockRelatorioFinanceiro)

      expect(dados.titulo).toBe('Relatório Financeiro')
      expect(dados.periodo).toBe('01/01/2024 a 31/01/2024')
      expect(dados.secoes).toHaveLength(4)

      // Verificar seção de receitas
      const secaoReceitas = dados.secoes.find((s: any) => s.titulo === 'Receitas')
      expect(secaoReceitas).toBeDefined()
      expect(secaoReceitas.dados).toHaveLength(3)
      expect(secaoReceitas.dados[0].valor).toMatch(/R\$\s*5\.000,00/)

      // Verificar seção de despesas
      const secaoDespesas = dados.secoes.find((s: any) => s.titulo === 'Despesas')
      expect(secaoDespesas).toBeDefined()
      expect(secaoDespesas.dados[0].valor).toMatch(/R\$\s*1\.500,00/)

      // Verificar seção de inadimplência
      const secaoInadimplencia = dados.secoes.find((s: any) => s.titulo === 'Inadimplência')
      expect(secaoInadimplencia).toBeDefined()
      expect(secaoInadimplencia.dados[2].valor).toBe('20%')

      // Verificar seção de rentabilidade
      const secaoRentabilidade = dados.secoes.find((s: any) => s.titulo === 'Rentabilidade')
      expect(secaoRentabilidade).toBeDefined()
      expect(secaoRentabilidade.dados[2].valor).toBe('70%')
    })
  })

  describe('gerarDadosExcelFinanceiro', () => {
    it('deve gerar dados corretos para Excel do relatório financeiro', () => {
      const dados = ExportService.gerarDadosExcelFinanceiro(mockRelatorioFinanceiro)

      expect(dados.planilhas).toHaveLength(1)
      expect(dados.planilhas[0].nome).toBe('Resumo')
      expect(dados.planilhas[0].dados).toContainEqual(['Período', '2024-01-01 a 2024-01-31'])
      expect(dados.planilhas[0].dados).toContainEqual(['Total de Receitas', 5000])
      expect(dados.planilhas[0].dados).toContainEqual(['Manutenção', 800])
    })

    it('deve incluir planilhas de detalhes quando fornecidas', () => {
      const detalhes = {
        pagamentos: [
          {
            id: 'p1',
            contrato_id: 'c1',
            mes_referencia: '2024-01-01',
            valor_devido: 2000,
            valor_pago: 2000,
            data_vencimento: '2024-01-10',
            data_pagamento: '2024-01-10',
            status: 'pago'
          }
        ],
        despesas: [
          {
            id: 'd1',
            imovel_id: 'i1',
            categoria: 'manutencao',
            descricao: 'Reparo',
            valor: 500,
            data_despesa: '2024-01-15',
            status: 'pago'
          }
        ]
      }

      const dados = ExportService.gerarDadosExcelFinanceiro(mockRelatorioFinanceiro, detalhes)

      expect(dados.planilhas).toHaveLength(3)
      expect(dados.planilhas[1].nome).toBe('Pagamentos')
      expect(dados.planilhas[2].nome).toBe('Despesas')
    })
  })

  describe('gerarDadosPDFInadimplencia', () => {
    it('deve gerar dados corretos para PDF do relatório de inadimplência', () => {
      const parametros = { data_corte: '2024-02-10', dias_minimos: 1 }
      const dados = ExportService.gerarDadosPDFInadimplencia(mockRelatorioInadimplencia, parametros)

      expect(dados.titulo).toBe('Relatório de Inadimplência')
      expect(dados.dataCorte).toBe('10/02/2024')
      expect(dados.secoes).toHaveLength(2)

      // Verificar seção de resumo
      const secaoResumo = dados.secoes.find((s: any) => s.titulo === 'Resumo')
      expect(secaoResumo).toBeDefined()
      expect(secaoResumo.dados[0].valor).toBe('1')
      expect(secaoResumo.dados[1].valor).toMatch(/R\$\s*2\.100,00/)

      // Verificar tabela de contratos
      const secaoContratos = dados.secoes.find((s: any) => s.titulo === 'Contratos em Atraso')
      expect(secaoContratos).toBeDefined()
      expect(secaoContratos.tabela.linhas).toHaveLength(1)
      expect(secaoContratos.tabela.linhas[0][0]).toBe('João Silva')
    })
  })

  describe('gerarDadosExcelInadimplencia', () => {
    it('deve gerar dados corretos para Excel do relatório de inadimplência', () => {
      const parametros = { data_corte: '2024-02-10', dias_minimos: 1 }
      const dados = ExportService.gerarDadosExcelInadimplencia(mockRelatorioInadimplencia, parametros)

      expect(dados.planilhas).toHaveLength(3)
      expect(dados.planilhas[0].nome).toBe('Resumo')
      expect(dados.planilhas[1].nome).toBe('Contratos em Atraso')
      expect(dados.planilhas[2].nome).toBe('Pagamentos Pendentes')

      // Verificar dados do resumo
      expect(dados.planilhas[0].dados).toContainEqual(['Data de Corte', '2024-02-10'])
      expect(dados.planilhas[0].dados).toContainEqual(['Total de Contratos em Atraso', 1])

      // Verificar dados dos contratos
      expect(dados.planilhas[1].dados[1]).toContain('João Silva')
      expect(dados.planilhas[1].dados[1]).toContain(2100)
    })
  })

  describe('gerarDadosPDFRentabilidade', () => {
    it('deve gerar dados corretos para PDF do relatório de rentabilidade', () => {
      const parametros = { data_inicio: '2024-01-01', data_fim: '2024-01-31' }
      const dados = ExportService.gerarDadosPDFRentabilidade(mockRelatorioRentabilidade, parametros)

      expect(dados.titulo).toBe('Relatório de Rentabilidade')
      expect(dados.periodo).toBe('01/01/2024 a 31/01/2024')
      expect(dados.secoes).toHaveLength(2)

      // Verificar seção de resumo
      const secaoResumo = dados.secoes.find((s: any) => s.titulo === 'Resumo Geral')
      expect(secaoResumo).toBeDefined()
      expect(secaoResumo.dados[0].valor).toMatch(/R\$\s*4\.000,00/)

      // Verificar tabela por imóvel
      const secaoImoveis = dados.secoes.find((s: any) => s.titulo === 'Rentabilidade por Imóvel')
      expect(secaoImoveis).toBeDefined()
      expect(secaoImoveis.tabela.linhas).toHaveLength(1)
      expect(secaoImoveis.tabela.linhas[0][0]).toBe('Rua A, 123')
    })
  })

  describe('gerarDadosExcelRentabilidade', () => {
    it('deve gerar dados corretos para Excel do relatório de rentabilidade', () => {
      const parametros = { data_inicio: '2024-01-01', data_fim: '2024-01-31', meses_periodo: 1 }
      const dados = ExportService.gerarDadosExcelRentabilidade(mockRelatorioRentabilidade, parametros)

      expect(dados.planilhas).toHaveLength(2)
      expect(dados.planilhas[0].nome).toBe('Resumo')
      expect(dados.planilhas[1].nome).toBe('Por Imóvel')

      // Verificar dados do resumo
      expect(dados.planilhas[0].dados).toContainEqual(['Período', '2024-01-01 a 2024-01-31'])
      expect(dados.planilhas[0].dados).toContainEqual(['Receita Bruta Total', 4000])

      // Verificar dados por imóvel
      expect(dados.planilhas[1].dados[1]).toContain('Rua A, 123')
      expect(dados.planilhas[1].dados[1]).toContain(87.5)
    })
  })

  describe('gerarNomeArquivo', () => {
    it('deve gerar nome de arquivo correto para PDF', () => {
      const nome = ExportService.gerarNomeArquivo('financeiro', 'pdf', '2024-01-01', '2024-01-31')
      expect(nome).toBe('relatorio-financeiro-20240101-20240131.pdf')
    })

    it('deve gerar nome de arquivo correto para Excel', () => {
      const nome = ExportService.gerarNomeArquivo('inadimplencia', 'excel')
      expect(nome).toMatch(/^relatorio-inadimplencia-\d{8}\.xlsx$/)
    })

    it('deve gerar nome de arquivo para rentabilidade', () => {
      const nome = ExportService.gerarNomeArquivo('rentabilidade', 'pdf', '2024-01-01', '2024-12-31')
      expect(nome).toBe('relatorio-rentabilidade-20240101-20241231.pdf')
    })
  })
})