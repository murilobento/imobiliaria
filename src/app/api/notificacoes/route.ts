import { NextRequest, NextResponse } from 'next/server';
import { NotificacaoService } from '@/lib/services/notificacaoService';
import { NotificacaoFilters } from '@/types/notificacao';
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

    const { searchParams } = new URL(request.url);
    
    // Construir filtros
    const filters: NotificacaoFilters = {
      user_id: authResult.user.id,
      tipo: searchParams.get('tipo') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      prioridade: searchParams.get('prioridade') as any || undefined,
      contrato_id: searchParams.get('contrato_id') || undefined,
      data_inicio: searchParams.get('data_inicio') || undefined,
      data_fim: searchParams.get('data_fim') || undefined,
      apenas_nao_lidas: searchParams.get('apenas_nao_lidas') === 'true'
    };

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const resultado = await NotificacaoService.buscarNotificacoes(filters, page, limit);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page,
      limit,
      totalPages: Math.ceil(resultado.total / limit)
    });

  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    if (!body.tipo || !body.titulo || !body.mensagem || !body.prioridade) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    const notificacaoData = {
      ...body,
      user_id: authResult.user.id
    };

    const notificacao = await NotificacaoService.criarNotificacao(notificacaoData);

    if (!notificacao) {
      return NextResponse.json(
        { error: 'Erro ao criar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notificacao
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}