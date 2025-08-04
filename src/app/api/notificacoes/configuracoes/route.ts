import { NextRequest, NextResponse } from 'next/server';
import { NotificacaoService } from '@/lib/services/notificacaoService';
import { verifyAuth } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const configuracao = await NotificacaoService.obterConfiguracaoNotificacao(authResult.user.id);

    if (!configuracao) {
      return NextResponse.json(
        { error: 'Erro ao obter configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: configuracao
    });

  } catch (error) {
    console.error('Erro ao buscar configurações de notificação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validar dados obrigatórios
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      );
    }

    // Validar valores numéricos
    if (body.dias_aviso_vencimento !== undefined) {
      const dias = parseInt(body.dias_aviso_vencimento);
      if (isNaN(dias) || dias < 0 || dias > 30) {
        return NextResponse.json(
          { error: 'Dias de aviso de vencimento deve ser entre 0 e 30' },
          { status: 400 }
        );
      }
    }

    if (body.dias_lembrete_atraso !== undefined) {
      const dias = parseInt(body.dias_lembrete_atraso);
      if (isNaN(dias) || dias < 1 || dias > 30) {
        return NextResponse.json(
          { error: 'Dias de lembrete de atraso deve ser entre 1 e 30' },
          { status: 400 }
        );
      }
    }

    if (body.max_lembretes_atraso !== undefined) {
      const max = parseInt(body.max_lembretes_atraso);
      if (isNaN(max) || max < 1 || max > 10) {
        return NextResponse.json(
          { error: 'Máximo de lembretes deve ser entre 1 e 10' },
          { status: 400 }
        );
      }
    }

    if (body.dias_aviso_contrato_vencendo !== undefined) {
      const dias = parseInt(body.dias_aviso_contrato_vencendo);
      if (isNaN(dias) || dias < 0 || dias > 90) {
        return NextResponse.json(
          { error: 'Dias de aviso de contrato vencendo deve ser entre 0 e 90' },
          { status: 400 }
        );
      }
    }

    const configuracao = await NotificacaoService.atualizarConfiguracaoNotificacao(body);

    if (!configuracao) {
      return NextResponse.json(
        { error: 'Erro ao atualizar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: configuracao,
      message: 'Configurações atualizadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações de notificação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}