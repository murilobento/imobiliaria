import { NextRequest, NextResponse } from 'next/server';
import { NotificacaoService } from '@/lib/services/notificacaoService';
import { verifyAuth } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (apenas admins podem processar notificações)
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário tem permissão de admin
    // Aqui você pode adicionar verificação de role se necessário
    // Por enquanto, qualquer usuário autenticado pode processar

    console.log('Iniciando processamento de notificações...');
    
    const resultado = await NotificacaoService.processarNotificacoes();

    console.log('Processamento concluído:', resultado);

    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Processamento de notificações concluído'
    });

  } catch (error) {
    console.error('Erro ao processar notificações:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar status do processamento
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

    // Retornar informações sobre o último processamento
    // Por enquanto, apenas confirma que o endpoint está ativo
    return NextResponse.json({
      success: true,
      message: 'Serviço de processamento de notificações ativo',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao verificar status do processamento:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}