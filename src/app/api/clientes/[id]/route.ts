import { NextRequest, NextResponse } from 'next/server'
import { getClienteById, updateCliente, deleteCliente, checkEmailExists } from '../../../../lib/api/clientes'
import { CreateClienteData } from '../../../../types/cliente'
import { validateCliente, sanitizeInput, formatValidationErrors } from '../../../../lib/utils/validation'

// GET /api/clientes/[id] - Buscar cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cliente = await getClienteById(id)
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/clientes/[id] - Atualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    
    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body)
    
    // Verificar emails existentes para validação de unicidade (excluindo o cliente atual)
    const { id } = await params
    const existingEmails: string[] = []
    if (sanitizedData.email) {
      const emailExists = await checkEmailExists(sanitizedData.email, id)
      if (emailExists) {
        existingEmails.push(sanitizedData.email)
      }
    }
    
    // Validar apenas os campos fornecidos
    const fieldsToValidate: any = {}
    if (sanitizedData.nome !== undefined) fieldsToValidate.nome = sanitizedData.nome
    if (sanitizedData.email !== undefined) fieldsToValidate.email = sanitizedData.email
    if (sanitizedData.telefone !== undefined) fieldsToValidate.telefone = sanitizedData.telefone
    if (sanitizedData.cpf_cnpj !== undefined) fieldsToValidate.cpf_cnpj = sanitizedData.cpf_cnpj
    if (sanitizedData.endereco !== undefined) fieldsToValidate.endereco = sanitizedData.endereco
    if (sanitizedData.observacoes !== undefined) fieldsToValidate.observacoes = sanitizedData.observacoes
    
    // Validar dados usando o sistema de validação
    const validationResult = validateCliente(fieldsToValidate, existingEmails)
    
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

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData: Partial<CreateClienteData> = {}
    
    if (sanitizedData.nome !== undefined) updateData.nome = sanitizedData.nome
    if (sanitizedData.email !== undefined) updateData.email = sanitizedData.email || undefined
    if (sanitizedData.telefone !== undefined) updateData.telefone = sanitizedData.telefone || undefined
    if (sanitizedData.cpf_cnpj !== undefined) updateData.cpf_cnpj = sanitizedData.cpf_cnpj || undefined
    if (sanitizedData.endereco !== undefined) updateData.endereco = sanitizedData.endereco || undefined
    if (sanitizedData.observacoes !== undefined) updateData.observacoes = sanitizedData.observacoes || undefined

    const cliente = await updateCliente(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: cliente,
      message: 'Cliente atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cliente não encontrado',
          message: 'O cliente especificado não foi encontrado'
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

// DELETE /api/clientes/[id] - Excluir cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Primeiro verificar se o cliente existe
    await getClienteById(id)
    
    // TODO: Verificar se o cliente tem imóveis vinculados antes de excluir
    // Esta verificação será implementada quando a tabela de imóveis for criada
    
    await deleteCliente(id)
    
    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}