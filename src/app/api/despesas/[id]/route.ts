import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateDespesa, sanitizeInput, validateRelationships, formatValidationErrors } from '@/lib/utils/validation'
import { CreateDespesaData } from '@/types/financeiro'
import { checkImovelExists } from '@/lib/api/despesas'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = params

    // Validar formato do ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('despesas_imoveis')
      .select(`
        *,
        imovel:imoveis(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar despesa:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Despesa não encontrada' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro na API de busca de despesa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = params
    const body = await request.json()
    const sanitizedData = sanitizeInput(body)

    // Validar formato do ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Validar dados de entrada (para atualização)
    const validation = validateDespesa(sanitizedData, true)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: formatValidationErrors(validation.errors)
        },
        { status: 400 }
      )
    }

    // Validar relacionamentos se fornecidos
    const relationshipValidations: Record<string, (id: string) => Promise<boolean>> = {}
    if (sanitizedData.imovel_id) {
      relationshipValidations.imovel_id = checkImovelExists
    }

    const relationshipErrors = await validateRelationships(sanitizedData, relationshipValidations)
    if (relationshipErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: formatValidationErrors(relationshipErrors)
        },
        { status: 400 }
      )
    }

    // Preparar dados para atualização
    const updateData: Partial<CreateDespesaData> = {}
    
    if (sanitizedData.imovel_id !== undefined) updateData.imovel_id = sanitizedData.imovel_id
    if (sanitizedData.categoria !== undefined) updateData.categoria = sanitizedData.categoria
    if (sanitizedData.descricao !== undefined) updateData.descricao = sanitizedData.descricao
    if (sanitizedData.valor !== undefined) updateData.valor = parseFloat(sanitizedData.valor)
    if (sanitizedData.data_despesa !== undefined) updateData.data_despesa = sanitizedData.data_despesa
    if (sanitizedData.data_pagamento !== undefined) updateData.data_pagamento = sanitizedData.data_pagamento
    if (sanitizedData.status !== undefined) updateData.status = sanitizedData.status
    if (sanitizedData.observacoes !== undefined) updateData.observacoes = sanitizedData.observacoes
    if (sanitizedData.user_id !== undefined) updateData.user_id = sanitizedData.user_id

    // Atualizar no banco de dados
    const { data, error } = await supabase
      .from('despesas_imoveis')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        imovel:imoveis(*)
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar despesa:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Despesa não encontrada' },
          { status: 404 }
        )
      }
      
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Imóvel não encontrado' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Erro ao atualizar despesa' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro na API de atualização de despesa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = params

    // Validar formato do ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se a despesa existe antes de deletar
    const { data: existingDespesa, error: checkError } = await supabase
      .from('despesas_imoveis')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existingDespesa) {
      return NextResponse.json(
        { error: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    // Deletar a despesa
    const { error } = await supabase
      .from('despesas_imoveis')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar despesa:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar despesa' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Despesa deletada com sucesso' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Erro na API de deleção de despesa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}