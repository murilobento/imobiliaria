import { NextRequest, NextResponse } from 'next/server'
import { processarVencimentosDiarios } from '../../../../lib/api/pagamentos'
import { ProcessamentoAutomaticoService } from '@/lib/services/processamentoAutomaticoService'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

// POST /api/pagamentos/processar-vencimentos - Processar vencimentos automáticos
export const POST = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const body = await request.json()
      const { dataReferencia, processamentoCompleto = false } = body

      // Se não fornecida, usar data atual
      const dataProcessamento = dataReferencia ? new Date(dataReferencia) : new Date()

      // Validar data se fornecida
      if (dataReferencia && isNaN(dataProcessamento.getTime())) {
        return NextResponse.json(
          { 
            error: 'Data inválida',
            message: 'A data de referência fornecida é inválida'
          },
          { status: 400 }
        )
      }

      let resultado;
      
      if (processamentoCompleto) {
        // Usar o novo serviço de processamento automático completo
        const resultadoCompleto = await ProcessamentoAutomaticoService.executarProcessamentoDiario(dataProcessamento);
        
        resultado = {
          ...resultadoCompleto.processamento_vencimentos,
          notificacoes_enviadas: resultadoCompleto.notificacoes_processadas,
          tempo_execucao_ms: resultadoCompleto.tempo_total_execucao_ms,
          logs_criados: resultadoCompleto.logs_auditoria.length,
          processamento_completo: true
        };

        // Log audit trail for complete processing
        await logFinancialAudit(
          'processamento_vencimentos_completo',
          'process',
          auditData,
          {
            entityType: 'processamento_automatico',
            affectedRecords: resultado.pagamentos_processados,
            executionTimeMs: resultado.tempo_execucao_ms,
            newValues: {
              data_processamento: dataProcessamento.toISOString(),
              pagamentos_processados: resultado.pagamentos_processados,
              pagamentos_vencidos: resultado.pagamentos_vencidos,
              notificacoes_enviadas: resultado.notificacoes_enviadas,
              processamento_completo: true
            }
          }
        );
        
        return NextResponse.json({
          success: resultadoCompleto.sucesso,
          data: resultado,
          message: resultadoCompleto.sucesso 
            ? `Processamento completo concluído: ${resultado.pagamentos_processados} pagamentos processados, ${resultado.pagamentos_vencidos} vencidos, ${resultado.notificacoes_enviadas} notificações criadas`
            : `Processamento concluído com ${resultadoCompleto.erros_criticos.length} erro(s)`,
          erros: resultadoCompleto.erros_criticos.length > 0 ? resultadoCompleto.erros_criticos : undefined
        });
      } else {
        // Usar o processamento simples original
        resultado = await processarVencimentosDiarios(dataProcessamento);

        // Log audit trail for simple processing
        await logFinancialAudit(
          'processamento_vencimentos_simples',
          'process',
          auditData,
          {
            entityType: 'processamento_vencimentos',
            affectedRecords: resultado.pagamentos_processados,
            newValues: {
              data_processamento: dataProcessamento.toISOString(),
              pagamentos_processados: resultado.pagamentos_processados,
              pagamentos_vencidos: resultado.pagamentos_vencidos,
              notificacoes_enviadas: resultado.notificacoes_enviadas,
              processamento_completo: false
            }
          }
        );
        
        return NextResponse.json({
          success: true,
          data: resultado,
          message: `Processamento concluído: ${resultado.pagamentos_processados} pagamentos processados, ${resultado.pagamentos_vencidos} vencidos, ${resultado.notificacoes_enviadas} notificações enviadas`
        });
      }
      
    } catch (error) {
      console.error('Erro ao processar vencimentos:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro interno do servidor',
          message: 'Ocorreu um erro inesperado durante o processamento. Tente novamente.'
        },
        { status: 500 }
      )
    }
  },
  {
    requiredPermission: 'financial.payments.process',
    operation: 'processar_vencimentos',
    sensitiveData: true,
    auditDetails: { action: 'process_payment_due_dates' }
  }
);