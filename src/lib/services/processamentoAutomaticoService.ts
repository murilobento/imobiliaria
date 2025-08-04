import { createClient } from '@supabase/supabase-js';
import { CalculoFinanceiroService } from './calculoFinanceiro';
import { NotificacaoService } from './notificacaoService';
import {
  ProcessamentoVencimento,
  ConfiguracaoFinanceira,
  PagamentoAluguel,
  PAGAMENTO_STATUS
} from '@/types/financeiro';

// Initialize Supabase client with service role key for server operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface LogAuditoria {
  id?: string;
  operacao: string;
  tipo: 'processamento_vencimentos' | 'atualizacao_status' | 'envio_notificacoes' | 'calculo_juros';
  detalhes: Record<string, any>;
  resultado: 'sucesso' | 'erro' | 'parcial';
  mensagem?: string;
  user_id?: string;
  data_execucao: string;
  tempo_execucao_ms?: number;
  registros_afetados?: number;
}

export interface ResultadoProcessamentoCompleto {
  processamento_vencimentos: ProcessamentoVencimento;
  notificacoes_processadas: number;
  logs_auditoria: LogAuditoria[];
  tempo_total_execucao_ms: number;
  sucesso: boolean;
  erros_criticos: string[];
}

export class ProcessamentoAutomaticoService {
  /**
   * Executa o processamento automático completo diário
   */
  static async executarProcessamentoDiario(
    dataReferencia: Date = new Date()
  ): Promise<ResultadoProcessamentoCompleto> {
    const inicioExecucao = Date.now();
    const logs: LogAuditoria[] = [];
    const errosCriticos: string[] = [];

    const resultado: ResultadoProcessamentoCompleto = {
      processamento_vencimentos: {
        pagamentos_processados: 0,
        pagamentos_vencidos: 0,
        notificacoes_enviadas: 0,
        erros: []
      },
      notificacoes_processadas: 0,
      logs_auditoria: [],
      tempo_total_execucao_ms: 0,
      sucesso: false,
      erros_criticos: []
    };

    try {
      // Log início do processamento
      const logInicio = await this.criarLogAuditoria({
        operacao: 'inicio_processamento_diario',
        tipo: 'processamento_vencimentos',
        detalhes: { data_referencia: dataReferencia.toISOString() },
        resultado: 'sucesso',
        mensagem: 'Iniciando processamento automático diário',
        data_execucao: new Date().toISOString()
      });
      if (logInicio) logs.push(logInicio);

      // 1. Processar vencimentos e atualizar status de pagamentos
      const inicioVencimentos = Date.now();
      resultado.processamento_vencimentos = await this.processarVencimentosComAuditoria(dataReferencia);
      const tempoVencimentos = Date.now() - inicioVencimentos;

      const logVencimentos = await this.criarLogAuditoria({
        operacao: 'processamento_vencimentos',
        tipo: 'processamento_vencimentos',
        detalhes: {
          data_referencia: dataReferencia.toISOString(),
          pagamentos_processados: resultado.processamento_vencimentos.pagamentos_processados,
          pagamentos_vencidos: resultado.processamento_vencimentos.pagamentos_vencidos
        },
        resultado: resultado.processamento_vencimentos.erros.length === 0 ? 'sucesso' : 'parcial',
        mensagem: `Processados ${resultado.processamento_vencimentos.pagamentos_processados} pagamentos`,
        data_execucao: new Date().toISOString(),
        tempo_execucao_ms: tempoVencimentos,
        registros_afetados: resultado.processamento_vencimentos.pagamentos_processados
      });
      if (logVencimentos) logs.push(logVencimentos);

      // 2. Processar notificações automáticas
      const inicioNotificacoes = Date.now();
      const resultadoNotificacoes = await NotificacaoService.processarNotificacoes();
      resultado.notificacoes_processadas = resultadoNotificacoes.notificacoes_criadas;
      const tempoNotificacoes = Date.now() - inicioNotificacoes;

      const logNotificacoes = await this.criarLogAuditoria({
        operacao: 'processamento_notificacoes',
        tipo: 'envio_notificacoes',
        detalhes: {
          notificacoes_criadas: resultadoNotificacoes.notificacoes_criadas,
          notificacoes_enviadas: resultadoNotificacoes.notificacoes_enviadas,
          detalhes: resultadoNotificacoes.detalhes
        },
        resultado: resultadoNotificacoes.erros.length === 0 ? 'sucesso' : 'parcial',
        mensagem: `Processadas ${resultadoNotificacoes.notificacoes_criadas} notificações`,
        data_execucao: new Date().toISOString(),
        tempo_execucao_ms: tempoNotificacoes,
        registros_afetados: resultadoNotificacoes.notificacoes_criadas
      });
      if (logNotificacoes) logs.push(logNotificacoes);

      // 3. Executar limpeza de dados antigos
      const inicioLimpeza = Date.now();
      const registrosLimpos = await this.executarLimpezaDados();
      const tempoLimpeza = Date.now() - inicioLimpeza;

      const logLimpeza = await this.criarLogAuditoria({
        operacao: 'limpeza_dados',
        tipo: 'processamento_vencimentos',
        detalhes: { registros_removidos: registrosLimpos },
        resultado: 'sucesso',
        mensagem: `Removidos ${registrosLimpos} registros antigos`,
        data_execucao: new Date().toISOString(),
        tempo_execucao_ms: tempoLimpeza,
        registros_afetados: registrosLimpos
      });
      if (logLimpeza) logs.push(logLimpeza);

      // Consolidar erros críticos
      errosCriticos.push(...resultado.processamento_vencimentos.erros);
      errosCriticos.push(...resultadoNotificacoes.erros);

      resultado.sucesso = errosCriticos.length === 0;
      resultado.tempo_total_execucao_ms = Date.now() - inicioExecucao;
      resultado.logs_auditoria = logs;
      resultado.erros_criticos = errosCriticos;

      // Log final
      const logFinal = await this.criarLogAuditoria({
        operacao: 'fim_processamento_diario',
        tipo: 'processamento_vencimentos',
        detalhes: {
          tempo_total_ms: resultado.tempo_total_execucao_ms,
          pagamentos_processados: resultado.processamento_vencimentos.pagamentos_processados,
          notificacoes_processadas: resultado.notificacoes_processadas,
          erros_criticos: errosCriticos.length
        },
        resultado: resultado.sucesso ? 'sucesso' : 'parcial',
        mensagem: `Processamento concluído ${resultado.sucesso ? 'com sucesso' : 'com erros'}`,
        data_execucao: new Date().toISOString(),
        tempo_execucao_ms: resultado.tempo_total_execucao_ms
      });
      if (logFinal) logs.push(logFinal);

    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      errosCriticos.push(`Erro crítico no processamento: ${mensagemErro}`);

      resultado.sucesso = false;
      resultado.erros_criticos = errosCriticos;
      resultado.tempo_total_execucao_ms = Date.now() - inicioExecucao;

      // Log de erro crítico
      const logErro = await this.criarLogAuditoria({
        operacao: 'erro_critico_processamento',
        tipo: 'processamento_vencimentos',
        detalhes: { erro: mensagemErro, stack: error instanceof Error ? error.stack : undefined },
        resultado: 'erro',
        mensagem: `Erro crítico: ${mensagemErro}`,
        data_execucao: new Date().toISOString(),
        tempo_execucao_ms: resultado.tempo_total_execucao_ms
      });
      if (logErro) logs.push(logErro);
    }

    return resultado;
  }

  /**
   * Processa vencimentos com auditoria detalhada
   */
  private static async processarVencimentosComAuditoria(
    dataReferencia: Date
  ): Promise<ProcessamentoVencimento> {
    const resultado: ProcessamentoVencimento = {
      pagamentos_processados: 0,
      pagamentos_vencidos: 0,
      notificacoes_enviadas: 0,
      erros: []
    };

    try {
      // Buscar configurações financeiras
      const configuracao = await this.obterConfiguracaoFinanceira();

      // Buscar pagamentos pendentes que podem estar vencidos
      const { data: pagamentosPendentes, error } = await supabase
        .from('pagamentos_aluguel')
        .select(`
          *,
          contrato:contratos_aluguel(
            *,
            imovel:imoveis(*),
            inquilino:clientes(*)
          )
        `)
        .eq('status', PAGAMENTO_STATUS.PENDENTE)
        .lte('data_vencimento', dataReferencia.toISOString().split('T')[0]);

      if (error) {
        resultado.erros.push(`Erro ao buscar pagamentos pendentes: ${error.message}`);
        return resultado;
      }

      if (!pagamentosPendentes || pagamentosPendentes.length === 0) {
        return resultado;
      }

      // Processar cada pagamento individualmente
      for (const pagamento of pagamentosPendentes) {
        try {
          const resultadoProcessamento = await this.processarPagamentoIndividual(
            pagamento,
            dataReferencia,
            configuracao
          );

          if (resultadoProcessamento.sucesso) {
            resultado.pagamentos_processados++;
            if (resultadoProcessamento.ficou_vencido) {
              resultado.pagamentos_vencidos++;
            }
          } else {
            resultado.erros.push(resultadoProcessamento.erro || 'Erro desconhecido');
          }

        } catch (error) {
          const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
          resultado.erros.push(`Erro ao processar pagamento ${pagamento.id}: ${mensagemErro}`);
        }
      }

    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      resultado.erros.push(`Erro geral no processamento: ${mensagemErro}`);
    }

    return resultado;
  }

  /**
   * Processa um pagamento individual com cálculos e auditoria
   */
  private static async processarPagamentoIndividual(
    pagamento: PagamentoAluguel,
    dataReferencia: Date,
    configuracao: ConfiguracaoFinanceira
  ): Promise<{
    sucesso: boolean;
    ficou_vencido: boolean;
    erro?: string;
    detalhes?: Record<string, any>;
  }> {
    try {
      const dataVencimento = new Date(pagamento.data_vencimento);
      const diasAtraso = Math.floor(
        (dataReferencia.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
      );

      let novoStatus = pagamento.status;
      let valorJuros = pagamento.valor_juros || 0;
      let valorMulta = pagamento.valor_multa || 0;
      let ficouVencido = false;

      // Verificar se deve aplicar juros e multa
      if (diasAtraso > configuracao.dias_carencia) {
        const calculo = CalculoFinanceiroService.calcularJurosMulta(
          pagamento.valor_devido,
          diasAtraso,
          configuracao.taxa_juros_mensal,
          configuracao.taxa_multa,
          configuracao.dias_carencia
        );

        valorJuros = calculo.juros;
        valorMulta = calculo.multa;
        novoStatus = PAGAMENTO_STATUS.ATRASADO;
        ficouVencido = true;
      }

      // Atualizar pagamento no banco
      const { error: updateError } = await supabase
        .from('pagamentos_aluguel')
        .update({
          valor_juros: valorJuros,
          valor_multa: valorMulta,
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', pagamento.id);

      if (updateError) {
        return {
          sucesso: false,
          ficou_vencido: false,
          erro: `Erro ao atualizar pagamento: ${updateError.message}`
        };
      }

      // Criar log de auditoria para este pagamento específico
      await this.criarLogAuditoria({
        operacao: 'atualizacao_pagamento_individual',
        tipo: 'atualizacao_status',
        detalhes: {
          pagamento_id: pagamento.id,
          contrato_id: pagamento.contrato_id,
          dias_atraso: diasAtraso,
          valor_devido: pagamento.valor_devido,
          valor_juros_anterior: pagamento.valor_juros || 0,
          valor_multa_anterior: pagamento.valor_multa || 0,
          valor_juros_novo: valorJuros,
          valor_multa_novo: valorMulta,
          status_anterior: pagamento.status,
          status_novo: novoStatus,
          endereco_imovel: pagamento.contrato?.imovel?.endereco_completo
        },
        resultado: 'sucesso',
        mensagem: ficouVencido
          ? `Pagamento marcado como atrasado - ${diasAtraso} dias`
          : 'Pagamento processado sem alteração de status',
        data_execucao: new Date().toISOString(),
        registros_afetados: 1
      });

      return {
        sucesso: true,
        ficou_vencido: ficouVencido,
        detalhes: {
          dias_atraso: diasAtraso,
          valor_juros: valorJuros,
          valor_multa: valorMulta,
          status: novoStatus
        }
      };

    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        sucesso: false,
        ficou_vencido: false,
        erro: mensagemErro
      };
    }
  }

  /**
   * Obtém configuração financeira com fallback para valores padrão
   */
  private static async obterConfiguracaoFinanceira(): Promise<ConfiguracaoFinanceira> {
    try {
      const { data, error } = await supabase
        .from('configuracoes_financeiras')
        .select('*')
        .limit(1)
        .single();

      if (error || !data) {
        // Retornar configuração padrão
        return {
          taxa_juros_mensal: 0.01, // 1% ao mês
          taxa_multa: 0.02, // 2%
          taxa_comissao: 0.10, // 10%
          dias_carencia: 5
        };
      }

      return data;
    } catch (error) {
      // Em caso de erro, retornar configuração padrão
      return {
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5
      };
    }
  }

  /**
   * Executa limpeza de dados antigos (logs, notificações antigas, etc.)
   */
  private static async executarLimpezaDados(): Promise<number> {
    let registrosRemovidos = 0;

    try {
      // Remover logs de auditoria mais antigos que 90 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 90);

      const { count: logsRemovidos } = await supabase
        .from('logs_auditoria')
        .delete({ count: 'exact' })
        .lt('data_execucao', dataLimite.toISOString());

      registrosRemovidos += logsRemovidos || 0;

      // Remover notificações lidas mais antigas que 30 dias
      const dataLimiteNotificacoes = new Date();
      dataLimiteNotificacoes.setDate(dataLimiteNotificacoes.getDate() - 30);

      const { count: notificacoesRemovidas } = await supabase
        .from('notificacoes')
        .delete({ count: 'exact' })
        .eq('status', 'lida')
        .lt('data_criacao', dataLimiteNotificacoes.toISOString());

      registrosRemovidos += notificacoesRemovidas || 0;

    } catch (error) {
      console.error('Erro na limpeza de dados:', error);
    }

    return registrosRemovidos;
  }

  /**
   * Cria log de auditoria
   */
  private static async criarLogAuditoria(log: Omit<LogAuditoria, 'id'>): Promise<LogAuditoria | null> {
    try {
      const { data, error } = await supabase
        .from('logs_auditoria')
        .insert(log)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar log de auditoria:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error);
      return null;
    }
  }

  /**
   * Busca logs de auditoria com filtros
   */
  static async buscarLogsAuditoria(
    filtros: {
      tipo?: LogAuditoria['tipo'];
      resultado?: LogAuditoria['resultado'];
      data_inicio?: string;
      data_fim?: string;
      operacao?: string;
    } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: LogAuditoria[]; total: number }> {
    try {
      let query = supabase
        .from('logs_auditoria')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
      if (filtros.resultado) query = query.eq('resultado', filtros.resultado);
      if (filtros.operacao) query = query.ilike('operacao', `%${filtros.operacao}%`);
      if (filtros.data_inicio) query = query.gte('data_execucao', filtros.data_inicio);
      if (filtros.data_fim) query = query.lte('data_execucao', filtros.data_fim);

      // Paginação
      const offset = (page - 1) * limit;
      query = query
        .order('data_execucao', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * Obtém estatísticas do último processamento
   */
  static async obterEstatisticasUltimoProcessamento(): Promise<{
    ultimo_processamento?: string;
    pagamentos_processados: number;
    pagamentos_vencidos: number;
    notificacoes_enviadas: number;
    tempo_execucao_ms: number;
    sucesso: boolean;
  }> {
    try {
      const { data: ultimoLog } = await supabase
        .from('logs_auditoria')
        .select('*')
        .eq('operacao', 'fim_processamento_diario')
        .order('data_execucao', { ascending: false })
        .limit(1)
        .single();

      if (!ultimoLog) {
        return {
          pagamentos_processados: 0,
          pagamentos_vencidos: 0,
          notificacoes_enviadas: 0,
          tempo_execucao_ms: 0,
          sucesso: false
        };
      }

      return {
        ultimo_processamento: ultimoLog.data_execucao,
        pagamentos_processados: ultimoLog.detalhes.pagamentos_processados || 0,
        pagamentos_vencidos: ultimoLog.detalhes.pagamentos_processados || 0,
        notificacoes_enviadas: ultimoLog.detalhes.notificacoes_processadas || 0,
        tempo_execucao_ms: ultimoLog.tempo_execucao_ms || 0,
        sucesso: ultimoLog.resultado === 'sucesso'
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do último processamento:', error);
      return {
        pagamentos_processados: 0,
        pagamentos_vencidos: 0,
        notificacoes_enviadas: 0,
        tempo_execucao_ms: 0,
        sucesso: false
      };
    }
  }
}