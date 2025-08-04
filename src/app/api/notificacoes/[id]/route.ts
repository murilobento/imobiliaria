import { NextRequest, NextResponse } from 'next/server';
import { NotificacaoService } from '@/lib/services/notificacaoService';
import { verifyAuth } from '@/lib/auth/jwt';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { action } = body;

    let success = false;

    switch (action) {
      case 'marcar_como_lida':
        success = await NotificacaoService.marcarComoLida(params.id);
        break;
      case 'marcar_como_enviada':
        success = await NotificacaoService.marcarComoEnviada(params.id);
        break;
      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao atualizar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notificação atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}