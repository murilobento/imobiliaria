import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
import { 
  Notificacao, 
  ConfiguracaoNotificacao,
  CreateNotificacaoData,
  CreateConfiguracaoNotificacaoData,
  UpdateNotificacaoData,
  UpdateConfiguracaoNotificacaoData,
  ProcessamentoNotificacao,
  NotificacaoFilters,
  NOTIFICACAO_TIPO,
  NOTIFICACAO_STATUS,
  NOTIFICACAO_PRIORIDADE,
  CONFIGURACAO_NOTIFICACAO_PADRAO
} from '@/types/notificacao';
import { ContratoAluguel, PagamentoAluguel, PAGAMENTO_STATUS } from '@/types/financeiro';

export class NotificacaoService {
  /**
   * Processa todas as notificações automáticas
   */
  static async processarNotificacoes(): Promise<ProcessamentoNotificacao> {
    const resultado: ProcessamentoNotificacao = {
      notificacoes_criadas: 0,
      notificacoes_enviadas: 0,
      erros: [],
      detalhes: {
        vencimentos_proximos: 0,
        pagamentos_atrasados: 0,
        contratos_vencendo: 0,
        lembretes_enviados: 0
      }
    };

    try {
      // Processar vencimentos próximos
      const vencimentosProximos = await this.processarVencimentosProximos();
      resultado.detalhes.vencimentos_proximos = vencimentosProximos;
      resultado.notificacoes_criadas += vencimentosProximos;

      // Processar pagamentos atrasados
      const pagamentosAtrasados = await this.processarPagamentosAtrasados();
      resultado.detalhes.pagamentos_atrasados = pagamentosAtrasados;
      resultado.notificacoes_criadas += pagamentosAtrasados;

      // Processar contratos vencendo
      const contratosVencendo = await this.processarContratosVencendo();
      resultado.detalhes.contratos_vencendo = contratosVencendo;
      resultado.notificacoes_criadas += contratosVencendo;

      // Processar lembretes de cobrança
      const lembretes = await this.processarLembretesCobranca();
      resultado.detalhes.lembretes_enviados = lembretes;
      resultado.notificacoes_criadas += lembretes;

      // Enviar notificações pendentes
      resultado.notificacoes_enviadas = await this.enviarNotificacoesPendentes();

    } catch (error) {
      resultado.erros.push(`Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return resultado;
  }

  /**
   * Processa notificações para vencimentos próximos
   */
  private static async processarVencimentosProximos(): Promise<number> {
    let notificacoesCriadas = 0;

    try {
      // Buscar configurações de usuários ativos
      const { data: configuracoes } = await supabase
        .from('configuracoes_notificacao')
        .select('*')
        .eq('ativo', true)
        .eq('notificar_vencimento_proximo', true);

      if (!configuracoes) return 0;

      for (const config of configuracoes) {
        // Calcular data limite para vencimentos próximos
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + config.dias_aviso_vencimento);

        // Buscar pagamentos próximos do vencimento
        const { data: pagamentos } = await supabase
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
          .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
          .gte('data_vencimento', new Date().toISOString().split('T')[0]);

        if (pagamentos) {
          for (const pagamento of pagamentos) {
            // Verificar se já existe notificação para este pagamento
            const { data: notificacaoExistente } = await supabase
              .from('notificacoes')
              .select('id')
              .eq('tipo', NOTIFICACAO_TIPO.VENCIMENTO_PROXIMO)
              .eq('pagamento_id', pagamento.id)
              .eq('user_id', config.user_id)
              .single();

            if (!notificacaoExistente) {
              const diasRestantes = Math.ceil(
                (new Date(pagamento.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              const notificacao: CreateNotificacaoData = {
                tipo: NOTIFICACAO_TIPO.VENCIMENTO_PROXIMO,
                titulo: 'Vencimento Próximo',
                mensagem: `O aluguel do imóvel ${pagamento.contrato?.imovel?.endereco || 'N/A'} vence em ${diasRestantes} dia(s). Valor: R$ ${pagamento.valor_devido.toFixed(2)}`,
                prioridade: diasRestantes <= 1 ? NOTIFICACAO_PRIORIDADE.ALTA : NOTIFICACAO_PRIORIDADE.MEDIA,
                user_id: config.user_id,
                contrato_id: pagamento.contrato_id,
                pagamento_id: pagamento.id,
                metadata: {
                  dias_restantes: diasRestantes,
                  valor_devido: pagamento.valor_devido,
                  endereco_imovel: pagamento.contrato?.imovel?.endereco
                }
              };

              await this.criarNotificacao(notificacao);
              notificacoesCriadas++;
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar vencimentos próximos:', error);
    }

    return notificacoesCriadas;
  }

  /**
   * Processa notificações para pagamentos atrasados
   */
  private static async processarPagamentosAtrasados(): Promise<number> {
    let notificacoesCriadas = 0;

    try {
      // Buscar configurações de usuários ativos
      const { data: configuracoes } = await supabase
        .from('configuracoes_notificacao')
        .select('*')
        .eq('ativo', true)
        .eq('notificar_pagamento_atrasado', true);

      if (!configuracoes) return 0;

      for (const config of configuracoes) {
        // Buscar pagamentos atrasados
        const { data: pagamentos } = await supabase
          .from('pagamentos_aluguel')
          .select(`
            *,
            contrato:contratos_aluguel(
              *,
              imovel:imoveis(*),
              inquilino:clientes(*)
            )
          `)
          .eq('status', PAGAMENTO_STATUS.ATRASADO)
          .lt('data_vencimento', new Date().toISOString().split('T')[0]);

        if (pagamentos) {
          for (const pagamento of pagamentos) {
            const diasAtraso = Math.ceil(
              (new Date().getTime() - new Date(pagamento.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Verificar se já existe notificação recente para este pagamento
            const dataLimiteNotificacao = new Date();
            dataLimiteNotificacao.setDate(dataLimiteNotificacao.getDate() - config.dias_lembrete_atraso);

            const { data: notificacaoRecente } = await supabase
              .from('notificacoes')
              .select('id')
              .eq('tipo', NOTIFICACAO_TIPO.PAGAMENTO_ATRASADO)
              .eq('pagamento_id', pagamento.id)
              .eq('user_id', config.user_id)
              .gte('created_at', dataLimiteNotificacao.toISOString())
              .single();

            if (!notificacaoRecente) {
              // Contar quantas notificações já foram enviadas para este pagamento
              const { count } = await supabase
                .from('notificacoes')
                .select('id', { count: 'exact' })
                .eq('tipo', NOTIFICACAO_TIPO.PAGAMENTO_ATRASADO)
                .eq('pagamento_id', pagamento.id)
                .eq('user_id', config.user_id);

              if ((count || 0) < config.max_lembretes_atraso) {
                const valorTotal = pagamento.valor_devido + pagamento.valor_juros + pagamento.valor_multa;

                const notificacao: CreateNotificacaoData = {
                  tipo: NOTIFICACAO_TIPO.PAGAMENTO_ATRASADO,
                  titulo: 'Pagamento Atrasado',
                  mensagem: `O aluguel do imóvel ${pagamento.contrato?.imovel?.endereco || 'N/A'} está atrasado há ${diasAtraso} dia(s). Valor total: R$ ${valorTotal.toFixed(2)}`,
                  prioridade: diasAtraso > 30 ? NOTIFICACAO_PRIORIDADE.URGENTE : NOTIFICACAO_PRIORIDADE.ALTA,
                  user_id: config.user_id,
                  contrato_id: pagamento.contrato_id,
                  pagamento_id: pagamento.id,
                  metadata: {
                    dias_atraso: diasAtraso,
                    valor_devido: pagamento.valor_devido,
                    valor_juros: pagamento.valor_juros,
                    valor_multa: pagamento.valor_multa,
                    valor_total: valorTotal,
                    endereco_imovel: pagamento.contrato?.imovel?.endereco,
                    nome_inquilino: pagamento.contrato?.inquilino?.nome
                  }
                };

                await this.criarNotificacao(notificacao);
                notificacoesCriadas++;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar pagamentos atrasados:', error);
    }

    return notificacoesCriadas;
  }

  /**
   * Processa notificações para contratos próximos do vencimento
   */
  private static async processarContratosVencendo(): Promise<number> {
    let notificacoesCriadas = 0;

    try {
      // Buscar configurações de usuários ativos
      const { data: configuracoes } = await supabase
        .from('configuracoes_notificacao')
        .select('*')
        .eq('ativo', true)
        .eq('notificar_contrato_vencendo', true);

      if (!configuracoes) return 0;

      for (const config of configuracoes) {
        // Calcular data limite para contratos vencendo
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + config.dias_aviso_contrato_vencendo);

        // Buscar contratos próximos do vencimento
        const { data: contratos } = await supabase
          .from('contratos_aluguel')
          .select(`
            *,
            imovel:imoveis(*),
            inquilino:clientes(*)
          `)
          .eq('status', 'ativo')
          .lte('data_fim', dataLimite.toISOString().split('T')[0])
          .gte('data_fim', new Date().toISOString().split('T')[0]);

        if (contratos) {
          for (const contrato of contratos) {
            // Verificar se já existe notificação para este contrato
            const { data: notificacaoExistente } = await supabase
              .from('notificacoes')
              .select('id')
              .eq('tipo', NOTIFICACAO_TIPO.CONTRATO_VENCENDO)
              .eq('contrato_id', contrato.id)
              .eq('user_id', config.user_id)
              .single();

            if (!notificacaoExistente) {
              const diasRestantes = Math.ceil(
                (new Date(contrato.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              const notificacao: CreateNotificacaoData = {
                tipo: NOTIFICACAO_TIPO.CONTRATO_VENCENDO,
                titulo: 'Contrato Vencendo',
                mensagem: `O contrato do imóvel ${contrato.imovel?.endereco || 'N/A'} vence em ${diasRestantes} dia(s). Inquilino: ${contrato.inquilino?.nome || 'N/A'}`,
                prioridade: diasRestantes <= 7 ? NOTIFICACAO_PRIORIDADE.ALTA : NOTIFICACAO_PRIORIDADE.MEDIA,
                user_id: config.user_id,
                contrato_id: contrato.id,
                metadata: {
                  dias_restantes: diasRestantes,
                  data_fim: contrato.data_fim,
                  endereco_imovel: contrato.imovel?.endereco,
                  nome_inquilino: contrato.inquilino?.nome,
                  valor_aluguel: contrato.valor_aluguel
                }
              };

              await this.criarNotificacao(notificacao);
              notificacoesCriadas++;
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar contratos vencendo:', error);
    }

    return notificacoesCriadas;
  }

  /**
   * Processa lembretes de cobrança periódicos
   */
  private static async processarLembretesCobranca(): Promise<number> {
    let lembretesCriados = 0;

    try {
      // Buscar configurações de usuários ativos
      const { data: configuracoes } = await supabase
        .from('configuracoes_notificacao')
        .select('*')
        .eq('ativo', true)
        .eq('notificar_pagamento_atrasado', true);

      if (!configuracoes) return 0;

      for (const config of configuracoes) {
        // Buscar pagamentos atrasados que precisam de lembrete
        const { data: pagamentos } = await supabase
          .from('pagamentos_aluguel')
          .select(`
            *,
            contrato:contratos_aluguel(
              *,
              imovel:imoveis(*),
              inquilino:clientes(*)
            )
          `)
          .eq('status', PAGAMENTO_STATUS.ATRASADO)
          .lt('data_vencimento', new Date().toISOString().split('T')[0]);

        if (pagamentos) {
          for (const pagamento of pagamentos) {
            const diasAtraso = Math.ceil(
              (new Date().getTime() - new Date(pagamento.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Verificar se é hora de enviar lembrete (múltiplo do intervalo configurado)
            if (diasAtraso > 0 && diasAtraso % config.dias_lembrete_atraso === 0) {
              // Contar quantos lembretes já foram enviados
              const { count } = await supabase
                .from('notificacoes')
                .select('id', { count: 'exact' })
                .eq('tipo', NOTIFICACAO_TIPO.LEMBRETE_COBRANCA)
                .eq('pagamento_id', pagamento.id)
                .eq('user_id', config.user_id);

              if ((count || 0) < config.max_lembretes_atraso) {
                const valorTotal = pagamento.valor_devido + pagamento.valor_juros + pagamento.valor_multa;

                const notificacao: CreateNotificacaoData = {
                  tipo: NOTIFICACAO_TIPO.LEMBRETE_COBRANCA,
                  titulo: `Lembrete de Cobrança - ${diasAtraso} dias`,
                  mensagem: `Lembrete: O pagamento do imóvel ${pagamento.contrato?.imovel?.endereco || 'N/A'} continua em atraso. Valor total: R$ ${valorTotal.toFixed(2)}`,
                  prioridade: NOTIFICACAO_PRIORIDADE.ALTA,
                  user_id: config.user_id,
                  contrato_id: pagamento.contrato_id,
                  pagamento_id: pagamento.id,
                  metadata: {
                    dias_atraso: diasAtraso,
                    numero_lembrete: (count || 0) + 1,
                    valor_total: valorTotal,
                    endereco_imovel: pagamento.contrato?.imovel?.endereco,
                    nome_inquilino: pagamento.contrato?.inquilino?.nome
                  }
                };

                await this.criarNotificacao(notificacao);
                lembretesCriados++;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar lembretes de cobrança:', error);
    }

    return lembretesCriados;
  }

  /**
   * Envia notificações pendentes
   */
  private static async enviarNotificacoesPendentes(): Promise<number> {
    let notificacoesEnviadas = 0;

    try {
      // Buscar notificações pendentes
      const { data: notificacoes } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('status', NOTIFICACAO_STATUS.PENDENTE)
        .order('created_at', { ascending: true })
        .limit(100); // Processar em lotes

      if (notificacoes) {
        for (const notificacao of notificacoes) {
          try {
            // Aqui você pode integrar com serviços de email, SMS, push notifications, etc.
            // Por enquanto, apenas marcamos como enviada
            await this.marcarComoEnviada(notificacao.id!);
            notificacoesEnviadas++;
          } catch (error) {
            console.error(`Erro ao enviar notificação ${notificacao.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar notificações pendentes:', error);
    }

    return notificacoesEnviadas;
  }

  /**
   * Cria uma nova notificação
   */
  static async criarNotificacao(data: CreateNotificacaoData): Promise<Notificacao | null> {
    try {
      const { data: notificacao, error } = await supabase
        .from('notificacoes')
        .insert({
          ...data,
          status: NOTIFICACAO_STATUS.PENDENTE,
          data_criacao: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return notificacao;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  /**
   * Marca notificação como enviada
   */
  static async marcarComoEnviada(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({
          status: NOTIFICACAO_STATUS.ENVIADA,
          data_envio: new Date().toISOString()
        })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Erro ao marcar notificação como enviada:', error);
      return false;
    }
  }

  /**
   * Marca notificação como lida
   */
  static async marcarComoLida(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({
          status: NOTIFICACAO_STATUS.LIDA,
          data_leitura: new Date().toISOString()
        })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  /**
   * Busca notificações com filtros
   */
  static async buscarNotificacoes(
    filters: NotificacaoFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: Notificacao[]; total: number }> {
    try {
      let query = supabase
        .from('notificacoes')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filters.tipo) query = query.eq('tipo', filters.tipo);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.prioridade) query = query.eq('prioridade', filters.prioridade);
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.contrato_id) query = query.eq('contrato_id', filters.contrato_id);
      if (filters.data_inicio) query = query.gte('data_criacao', filters.data_inicio);
      if (filters.data_fim) query = query.lte('data_criacao', filters.data_fim);
      if (filters.apenas_nao_lidas) {
        query = query.in('status', [NOTIFICACAO_STATUS.PENDENTE, NOTIFICACAO_STATUS.ENVIADA]);
      }

      // Paginação
      const offset = (page - 1) * limit;
      query = query
        .order('data_criacao', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * Busca ou cria configuração de notificação para um usuário
   */
  static async obterConfiguracaoNotificacao(userId: string): Promise<ConfiguracaoNotificacao | null> {
    try {
      // Tentar buscar configuração existente
      const { data: config, error } = await supabase
        .from('configuracoes_notificacao')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (config) return config;

      // Se não existe, criar com valores padrão
      if (error?.code === 'PGRST116') { // Not found
        const novaConfig: CreateConfiguracaoNotificacaoData = {
          user_id: userId,
          dias_aviso_vencimento: CONFIGURACAO_NOTIFICACAO_PADRAO.DIAS_AVISO_VENCIMENTO,
          notificar_vencimento_proximo: CONFIGURACAO_NOTIFICACAO_PADRAO.NOTIFICAR_VENCIMENTO_PROXIMO,
          notificar_pagamento_atrasado: CONFIGURACAO_NOTIFICACAO_PADRAO.NOTIFICAR_PAGAMENTO_ATRASADO,
          dias_lembrete_atraso: CONFIGURACAO_NOTIFICACAO_PADRAO.DIAS_LEMBRETE_ATRASO,
          max_lembretes_atraso: CONFIGURACAO_NOTIFICACAO_PADRAO.MAX_LEMBRETES_ATRASO,
          dias_aviso_contrato_vencendo: CONFIGURACAO_NOTIFICACAO_PADRAO.DIAS_AVISO_CONTRATO_VENCENDO,
          notificar_contrato_vencendo: CONFIGURACAO_NOTIFICACAO_PADRAO.NOTIFICAR_CONTRATO_VENCENDO,
          ativo: CONFIGURACAO_NOTIFICACAO_PADRAO.ATIVO
        };

        const { data: novaConfigCriada, error: errorCriacao } = await supabase
          .from('configuracoes_notificacao')
          .insert(novaConfig)
          .select()
          .single();

        if (errorCriacao) throw errorCriacao;
        return novaConfigCriada;
      }

      throw error;
    } catch (error) {
      console.error('Erro ao obter configuração de notificação:', error);
      return null;
    }
  }

  /**
   * Atualiza configuração de notificação
   */
  static async atualizarConfiguracaoNotificacao(data: UpdateConfiguracaoNotificacaoData): Promise<ConfiguracaoNotificacao | null> {
    try {
      const { data: config, error } = await supabase
        .from('configuracoes_notificacao')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return config;
    } catch (error) {
      console.error('Erro ao atualizar configuração de notificação:', error);
      return null;
    }
  }
}