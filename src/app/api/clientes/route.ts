import { NextRequest, NextResponse } from 'next/server'
import { getClientesList, createCliente, checkEmailExists } from '../../../lib/api/clientes'
import { CreateClienteData } from '../../../types/cliente'
import { validateCliente, sanitizeInput, formatValidationErrors } from '../../../lib/utils/validation'
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils'

// GET /api/clientes - Listar clientes com paginação e filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      search: searchParams.get('search') || '',
      orderBy: (searchParams.get('orderBy') as 'nome' | 'email' | 'created_at') || 'nome',
      orderDirection: (searchParams.get('orderDirection') as 'asc' | 'desc') || 'asc'
    }

    const result = await getClientesList(params)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/clientes - Criar novo cliente
export async function POST(request: NextRequest) {
  try {
    // Autenticar usuário
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Você precisa estar logado para criar clientes'
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
          message: 'Você não tem permissão para criar clientes'
        },
        { status: 403 }
      );
    }

    const body = await request.json()
    
    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body)
    
    // Verificar emails existentes para validação de unicidade
    const existingEmails: string[] = []
    if (sanitizedData.email) {
      const emailExists = await checkEmailExists(sanitizedData.email)
      if (emailExists) {
        existingEmails.push(sanitizedData.email)
      }
    }
    
    // Validar dados usando o sistema de validação
    const validationResult = validateCliente(sanitizedData, existingEmails)
    
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

    const clienteData: CreateClienteData = {
      nome: sanitizedData.nome,
      email: sanitizedData.email || undefined,
      telefone: sanitizedData.telefone || undefined,
      cpf_cnpj: sanitizedData.cpf_cnpj || undefined,
      endereco: sanitizedData.endereco || undefined,
      observacoes: sanitizedData.observacoes || undefined,
      user_id: authResult.user!.id // ID do usuário responsável
    }

    const cliente = await createCliente(clienteData)
    
    return NextResponse.json({
      success: true,
      data: cliente,
      message: 'Cliente criado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
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