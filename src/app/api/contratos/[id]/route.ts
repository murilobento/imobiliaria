import { NextRequest, NextResponse } from 'next/server'
import { getContratoById, updateContrato, encerrarContrato, checkImovelDisponivel, checkImovelExists, checkClienteExists } from '../../../../lib/api/contratos'
import { CreateContratoData } from '../../../../types/financeiro'
import { validateContrato, sanitizeInput, formatValidationErrors } from '../../../../lib/utils/validation'
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils'

// GET /api/contratos/[id] - Buscar contrato por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contrato = await getContratoById(id)
    return NextResponse.json(contrato)
  } catch (error) {
    console.error('Erro ao buscar contrato:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Contrato não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/contratos/[id] - Atualizar contrato
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticar usuário
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Você precisa estar logado para atualizar contratos'
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
          message: 'Você não tem permissão para atualizar contratos'
        },
        { status: 403 }
      );
    }

    const body = await request.json()
    const { id } = await params
    
    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body)
    
    // Validar apenas os campos fornecidos
    const fieldsToValidate: any = {}
    if (sanitizedData.imovel_id !== undefined) fieldsToValidate.imovel_id = sanitizedData.imovel_id
    if (sanitizedData.inquilino_id !== undefined) fieldsToValidate.inquilino_id = sanitizedData.inquilino_id
    if (sanitizedData.proprietario_id !== undefined) fieldsToValidate.proprietario_id = sanitizedData.proprietario_id
    if (sanitizedData.valor_aluguel !== undefined) fieldsToValidate.valor_aluguel = sanitizedData.valor_aluguel
    if (sanitizedData.valor_deposito !== undefined) fieldsToValidate.valor_deposito = sanitizedData.valor_deposito
    if (sanitizedData.data_inicio !== undefined) fieldsToValidate.data_inicio = sanitizedData.data_inicio
    if (sanitizedData.data_fim !== undefined) fieldsToValidate.data_fim = sanitizedData.data_fim
    if (sanitizedData.dia_vencimento !== undefined) fieldsToValidate.dia_vencimento = sanitizedData.dia_vencimento
    if (sanitizedData.status !== undefined) fieldsToValidate.status = sanitizedData.status
    if (sanitizedData.observacoes !== undefined) fieldsToValidate.observacoes = sanitizedData.observacoes
    
    // Validar dados usando o sistema de validação
    const validationResult = validateContrato(fieldsToValidate)
    
    if (!validationResult.isValid) {
      const formattedErrors = formatValidationErrors(validationResult.errors)
      return NextResponse.json(
        { 
          success: false,
          error: 'Dados inválidos',
          errors: formattedErrors,
          message: 'Por favor, corrija os erros nos campos indicados'
        },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe (se fornecido)
    if (sanitizedData.imovel_id) {
      const imovelExists = await checkImovelExists(sanitizedData.imovel_id)
      if (!imovelExists) {
        return NextResponse.json(
          { 
            error: 'Imóvel não encontrado',
            message: 'O imóvel especificado não foi encontrado'
          },
          { status: 404 }
        )
      }

      // Verificar se o imóvel está disponível (excluindo o contrato atual)
      const imovelDisponivel = await checkImovelDisponivel(sanitizedData.imovel_id, id)
      if (!imovelDisponivel) {
        return NextResponse.json(
          { 
            error: 'Imóvel não disponível',
            message: 'Este imóvel já possui outro contrato ativo'
          },
          { status: 409 }
        )
      }
    }

    // Verificar se o inquilino existe (se fornecido)
    if (sanitizedData.inquilino_id) {
      const inquilinoExists = await checkClienteExists(sanitizedData.inquilino_id)
      if (!inquilinoExists) {
        return NextResponse.json(
          { 
            error: 'Inquilino não encontrado',
            message: 'O inquilino especificado não foi encontrado'
          },
          { status: 404 }
        )
      }
    }

    // Verificar se o proprietário existe (se fornecido)
    if (sanitizedData.proprietario_id) {
      const proprietarioExists = await checkClienteExists(sanitizedData.proprietario_id)
      if (!proprietarioExists) {
        return NextResponse.json(
          { 
            error: 'Proprietário não encontrado',
            message: 'O proprietário especificado não foi encontrado'
          },
          { status: 404 }
        )
      }
    }

    // Validar datas (se ambas fornecidas)
    if (sanitizedData.data_inicio && sanitizedData.data_fim) {
      const dataInicio = new Date(sanitizedData.data_inicio)
      const dataFim = new Date(sanitizedData.data_fim)
      
      if (dataFim <= dataInicio) {
        return NextResponse.json(
          { 
            error: 'Datas inválidas',
            message: 'A data de fim deve ser posterior à data de início'
          },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData: Partial<CreateContratoData> = {}
    
    if (sanitizedData.imovel_id !== undefined) updateData.imovel_id = sanitizedData.imovel_id
    if (sanitizedData.inquilino_id !== undefined) updateData.inquilino_id = sanitizedData.inquilino_id
    if (sanitizedData.proprietario_id !== undefined) updateData.proprietario_id = sanitizedData.proprietario_id || undefined
    if (sanitizedData.valor_aluguel !== undefined) updateData.valor_aluguel = parseFloat(sanitizedData.valor_aluguel)
    if (sanitizedData.valor_deposito !== undefined) updateData.valor_deposito = sanitizedData.valor_deposito ? parseFloat(sanitizedData.valor_deposito) : undefined
    if (sanitizedData.data_inicio !== undefined) updateData.data_inicio = sanitizedData.data_inicio
    if (sanitizedData.data_fim !== undefined) updateData.data_fim = sanitizedData.data_fim
    if (sanitizedData.dia_vencimento !== undefined) updateData.dia_vencimento = parseInt(sanitizedData.dia_vencimento)
    if (sanitizedData.status !== undefined) updateData.status = sanitizedData.status
    if (sanitizedData.observacoes !== undefined) updateData.observacoes = sanitizedData.observacoes || undefined

    const contrato = await updateContrato(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: contrato,
      message: 'Contrato atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Contrato não encontrado',
          message: 'O contrato especificado não foi encontrado'
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

// DELETE /api/contratos/[id] - Encerrar contrato (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticar usuário
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Você precisa estar logado para encerrar contratos'
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
          message: 'Você não tem permissão para encerrar contratos'
        },
        { status: 403 }
      );
    }

    const { id } = await params
    
    // Primeiro verificar se o contrato existe
    await getContratoById(id)
    
    // Encerrar o contrato (soft delete - muda status para encerrado)
    const contrato = await encerrarContrato(id)
    
    return NextResponse.json({
      success: true,
      data: contrato,
      message: 'Contrato encerrado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao encerrar contrato:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Contrato não encontrado',
          message: 'O contrato especificado não foi encontrado'
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