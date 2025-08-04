import { NextRequest, NextResponse } from 'next/server'
import { getPagamentoById, updatePagamento, deletePagamento } from '../../../../lib/api/pagamentos'
import { UpdatePagamentoData } from '../../../../types/financeiro'
import { validatePagamento, sanitizeInput, formatValidationErrors } from '../../../../lib/utils/validation'
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils'

// GET /api/pagamentos/[id] - Buscar pagamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      )
    }

    const pagamento = await getPagamentoById(id)
    
    return NextResponse.json({
      success: true,
      data: pagamento
    })
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/pagamentos/[id] - Atualizar pagamento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar usuário
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Você precisa estar logado para atualizar pagamentos'
        },
        { status: 401 }
      );
    }

    // Verificar se o usuário tem permissão (admin ou corretor)
    if (!['admin', 'real-estate-agent'].includes(authResult.user!.role)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Permissão negada',
          message: 'Você não tem permissão para atualizar pagamentos'
        },
        { status: 403 }
      );
    }

    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      )
    }

    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body)
    
    // Validar dados usando o sistema de validação (parcial para update)
    const validationResult = validatePagamento(sanitizedData, true)
    
    if (!validationResult.isValid) {
      const formattedErrors = formatValidationErrors(validationResult.errors)
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          errors: formattedErrors,
          message: 'Por favor, corrija os erros nos campos indicados'
        },
        { status: 400 }
      )
    }

    // Validar datas se fornecidas
    if (sanitizedData.data_pagamento && sanitizedData.data_vencimento) {
      const dataVencimento = new Date(sanitizedData.data_vencimento)
      const dataPagamento = new Date(sanitizedData.data_pagamento)
      
      if (dataPagamento < dataVencimento) {
        // Pagamento antecipado - permitido
      }
    }

    const updateData: UpdatePagamentoData = {
      id,
      ...sanitizedData
    }

    // Converter strings para números se necessário
    if (sanitizedData.valor_devido) {
      updateData.valor_devido = parseFloat(sanitizedData.valor_devido)
    }
    if (sanitizedData.valor_pago) {
      updateData.valor_pago = parseFloat(sanitizedData.valor_pago)
    }
    if (sanitizedData.valor_juros) {
      updateData.valor_juros = parseFloat(sanitizedData.valor_juros)
    }
    if (sanitizedData.valor_multa) {
      updateData.valor_multa = parseFloat(sanitizedData.valor_multa)
    }

    const pagamento = await updatePagamento(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: pagamento,
      message: 'Pagamento atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Pagamento não encontrado',
          message: 'O pagamento especificado não foi encontrado'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado. Tente novamente.'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/pagamentos/[id] - Deletar pagamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar usuário
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Você precisa estar logado para deletar pagamentos'
        },
        { status: 401 }
      );
    }

    // Verificar se o usuário tem permissão (apenas admin)
    if (authResult.user!.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Permissão negada',
          message: 'Apenas administradores podem deletar pagamentos'
        },
        { status: 403 }
      );
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do pagamento é obrigatório' },
        { status: 400 }
      )
    }

    await deletePagamento(id)
    
    return NextResponse.json({
      success: true,
      message: 'Pagamento deletado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar pagamento:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Pagamento não encontrado',
          message: 'O pagamento especificado não foi encontrado'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado. Tente novamente.'
      },
      { status: 500 }
    )
  }
}