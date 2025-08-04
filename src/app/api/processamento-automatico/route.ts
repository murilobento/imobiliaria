import { NextRequest, NextResponse } from 'next/server';
import { ProcessamentoAutomaticoService } from '@/lib/services/processamentoAutomaticoService';

// POST /api/processamento-automatico - Executar processamento automático diário
export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição vem de uma fonte autorizada (cron job)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET_KEY;
    
    // Verificar autenticação para cron jobs
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Token de autorização inválido para processamento automático'
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { dataReferencia, forcarExecucao = false } = body;

    // Validar data de referência se fornecida
    let dataProcessamento = new Date();
    if (dataReferencia) {
      dataProcessamento = new Date(dataReferencia);
      if (isNaN(dataProcessamento.getTime())) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Data inválida',
            message: 'A data de referência fornecida é inválida'
          },
          { status: 400 }
        );
      }
    }

    // Verificar se já foi executado hoje (a menos que seja forçado)
    if (!forcarExecucao) {
      const estatisticas = await ProcessamentoAutomaticoService.obterEstatisticasUltimoProcessamento();
      if (estatisticas.ultimo_processamento) {
        const ultimaExecucao = new Date(estatisticas.ultimo_processamento);
        const hoje = new Date();
        
        // Verificar se já foi executado hoje
        if (
          ultimaExecucao.getDate() === hoje.getDate() &&
          ultimaExecucao.getMonth() === hoje.getMonth() &&
          ultimaExecucao.getFullYear() === hoje.getFullYear()
        ) {
          return NextResponse.json({
            success: true,
            message: 'Processamento já foi executado hoje',
            data: {
              ja_executado: true,
              ultima_execucao: estatisticas.ultimo_processamento,
              estatisticas
            }
          });
        }
      }
    }

    console.log(`Iniciando processamento automático para data: ${dataProcessamento.toISOString()}`);

    // Executar processamento automático completo
    const resultado = await ProcessamentoAutomaticoService.executarProcessamentoDiario(dataProcessamento);

    // Log do resultado
    console.log('Processamento automático concluído:', {
      sucesso: resultado.sucesso,
      tempo_execucao: resultado.tempo_total_execucao_ms,
      pagamentos_processados: resultado.processamento_vencimentos.pagamentos_processados,
      notificacoes_processadas: resultado.notificacoes_processadas,
      erros_criticos: resultado.erros_criticos.length
    });

    return NextResponse.json({
      success: resultado.sucesso,
      data: {
        processamento_vencimentos: resultado.processamento_vencimentos,
        notificacoes_processadas: resultado.notificacoes_processadas,
        tempo_total_execucao_ms: resultado.tempo_total_execucao_ms,
        logs_criados: resultado.logs_auditoria.length
      },
      message: resultado.sucesso 
        ? `Processamento concluído com sucesso: ${resultado.processamento_vencimentos.pagamentos_processados} pagamentos processados, ${resultado.notificacoes_processadas} notificações criadas`
        : `Processamento concluído com ${resultado.erros_criticos.length} erro(s)`,
      erros: resultado.erros_criticos.length > 0 ? resultado.erros_criticos : undefined
    });

  } catch (error) {
    console.error('Erro no processamento automático:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado durante o processamento automático',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// GET /api/processamento-automatico - Obter estatísticas do último processamento
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação básica para consultas
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET_KEY;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Token de autorização inválido'
        },
        { status: 401 }
      );
    }

    const estatisticas = await ProcessamentoAutomaticoService.obterEstatisticasUltimoProcessamento();

    return NextResponse.json({
      success: true,
      data: estatisticas,
      message: 'Estatísticas obtidas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao obter estatísticas do processamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}