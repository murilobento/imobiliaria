import { NextRequest, NextResponse } from 'next/server';
import { ProcessamentoAutomaticoService } from '@/lib/services/processamentoAutomaticoService';
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware';

// GET /api/logs-auditoria - Buscar logs de auditoria
export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parâmetros de filtro
      const tipoParam = searchParams.get('tipo');
      const resultadoParam = searchParams.get('resultado');
      
      // Validar e converter tipos específicos
      const tiposValidos: Array<'processamento_vencimentos' | 'atualizacao_status' | 'envio_notificacoes' | 'calculo_juros'> = [
        'processamento_vencimentos', 
        'atualizacao_status', 
        'envio_notificacoes', 
        'calculo_juros'
      ];
      
      const resultadosValidos: Array<'sucesso' | 'erro' | 'parcial'> = [
        'sucesso', 
        'erro', 
        'parcial'
      ];
      
      const filtros = {
        tipo: tipoParam && tiposValidos.includes(tipoParam as any) 
          ? tipoParam as 'processamento_vencimentos' | 'atualizacao_status' | 'envio_notificacoes' | 'calculo_juros'
          : undefined,
        resultado: resultadoParam && resultadosValidos.includes(resultadoParam as any)
          ? resultadoParam as 'sucesso' | 'erro' | 'parcial'
          : undefined,
        operacao: searchParams.get('operacao') || undefined,
        data_inicio: searchParams.get('data_inicio') || undefined,
        data_fim: searchParams.get('data_fim') || undefined
      };

      // Parâmetros de paginação
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Máximo 100 por página

      // Validar parâmetros
      if (page < 1) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Parâmetro inválido',
            message: 'O número da página deve ser maior que 0'
          },
          { status: 400 }
        );
      }

      if (limit < 1) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Parâmetro inválido',
            message: 'O limite deve ser maior que 0'
          },
          { status: 400 }
        );
      }

      // Validar datas se fornecidas
      if (filtros.data_inicio && isNaN(new Date(filtros.data_inicio).getTime())) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Data inválida',
            message: 'A data de início fornecida é inválida'
          },
          { status: 400 }
        );
      }

      if (filtros.data_fim && isNaN(new Date(filtros.data_fim).getTime())) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Data inválida',
            message: 'A data de fim fornecida é inválida'
          },
          { status: 400 }
        );
      }

      // Buscar logs
      const resultado = await ProcessamentoAutomaticoService.buscarLogsAuditoria(
        filtros,
        page,
        limit
      );

      const totalPages = Math.ceil(resultado.total / limit);

      // Log audit trail for accessing audit logs
      await logFinancialAudit(
        'audit_logs_access',
        'view',
        auditData,
        {
          entityType: 'audit_logs',
          affectedRecords: resultado.data?.length || 0,
          newValues: { filtros, pagination: { page, limit } }
        }
      );

      return NextResponse.json({
        success: true,
        data: resultado.data,
        pagination: {
          page,
          limit,
          total: resultado.total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filtros,
        message: `${resultado.data.length} logs encontrados`
      });

    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro interno do servidor',
          message: 'Erro ao buscar logs de auditoria',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        },
        { status: 500 }
      );
    }
  },
  {
    requiredPermission: 'audit.logs.view',
    operation: 'view_audit_logs',
    auditDetails: { action: 'access_audit_logs' }
  }
);