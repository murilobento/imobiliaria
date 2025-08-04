import { NextRequest, NextResponse } from 'next/server'
import { getContratosList, createContrato, checkImovelDisponivel, checkImovelExists, checkClienteExists } from '../../../lib/api/contratos'
import { CreateContratoData, ContratoFilters } from '../../../types/financeiro'
import { validateContrato, sanitizeInput, formatValidationErrors } from '../../../lib/utils/validation'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

// GET /api/contratos - Listar contratos com paginação e filtros
export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const { searchParams } = new URL(request.url)
      
      // Parâmetros de paginação
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '10')
      const search = searchParams.get('search') || ''
      const orderBy = (searchParams.get('orderBy') as 'valor_aluguel' | 'data_inicio' | 'data_fim' | 'created_at') || 'created_at'
      const orderDirection = (searchParams.get('orderDirection') as 'asc' | 'desc') || 'desc'

      // Filtros específicos
      const filters: ContratoFilters = {}
      if (searchParams.get('status')) {
        filters.status = searchParams.get('status') as any
      }
      if (searchParams.get('imovel_id')) {
        filters.imovel_id = searchParams.get('imovel_id')!
      }
      if (searchParams.get('inquilino_id')) {
        filters.inquilino_id = searchParams.get('inquilino_id')!
      }
      if (searchParams.get('data_inicio')) {
        filters.data_inicio = searchParams.get('data_inicio')!
      }
      if (searchParams.get('data_fim')) {
        filters.data_fim = searchParams.get('data_fim')!
      }
      if (searchParams.get('valor_min')) {
        filters.valor_min = parseFloat(searchParams.get('valor_min')!)
      }
      if (searchParams.get('valor_max')) {
        filters.valor_max = parseFloat(searchParams.get('valor_max')!)
      }

      const params = {
        page,
        limit,
        search,
        orderBy,
        orderDirection,
        filters
      }

      const result = await getContratosList(params)
      
      // Log audit trail for data access
      await logFinancialAudit(
        'contratos_list',
        'view',
        auditData,
        {
          entityType: 'contratos',
          affectedRecords: result.data?.length || 0,
          newValues: { filters, pagination: { page, limit } }
        }
      );
      
      return NextResponse.json(result)
    } catch (error) {
      console.error('Erro ao buscar contratos:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
  {
    requiredPermission: 'financial.contracts.view',
    operation: 'list_contratos',
    auditDetails: { action: 'list_contracts' }
  }
);

// POST /api/contratos - Criar novo contrato
export const POST = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const body = await request.json()
      
      // Sanitizar dados de entrada
      const sanitizedData = sanitizeInput(body)
      
      // Validar dados usando o sistema de validação
      const validationResult = validateContrato(sanitizedData)
      
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

      // Verificar se o imóvel existe
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

      // Verificar se o imóvel está disponível
      const imovelDisponivel = await checkImovelDisponivel(sanitizedData.imovel_id)
      if (!imovelDisponivel) {
        return NextResponse.json(
          { 
            error: 'Imóvel não disponível',
            message: 'Este imóvel já possui um contrato ativo'
          },
          { status: 409 }
        )
      }

      // Verificar se o inquilino existe
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

      // Validar datas
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

      const contratoData: CreateContratoData = {
        imovel_id: sanitizedData.imovel_id,
        inquilino_id: sanitizedData.inquilino_id,
        proprietario_id: sanitizedData.proprietario_id || undefined,
        valor_aluguel: parseFloat(sanitizedData.valor_aluguel),
        valor_deposito: sanitizedData.valor_deposito ? parseFloat(sanitizedData.valor_deposito) : undefined,
        data_inicio: sanitizedData.data_inicio,
        data_fim: sanitizedData.data_fim,
        dia_vencimento: parseInt(sanitizedData.dia_vencimento),
        status: sanitizedData.status || 'ativo',
        observacoes: sanitizedData.observacoes || undefined,
        user_id: user.id // ID do usuário responsável
      }

      const contrato = await createContrato(contratoData)
      
      // Log audit trail for contract creation
      await logFinancialAudit(
        'contrato_create',
        'create',
        auditData,
        {
          entityType: 'contrato',
          entityId: contrato.id,
          newValues: {
            imovel_id: contratoData.imovel_id,
            inquilino_id: contratoData.inquilino_id,
            valor_aluguel: contratoData.valor_aluguel,
            data_inicio: contratoData.data_inicio,
            data_fim: contratoData.data_fim
          }
        }
      );
      
      return NextResponse.json({
        success: true,
        data: contrato,
        message: 'Contrato criado com sucesso'
      }, { status: 201 })
    } catch (error) {
      console.error('Erro ao criar contrato:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro interno do servidor',
          message: 'Ocorreu um erro inesperado. Tente novamente.'
        },
        { status: 500 }
      )
    }
  },
  {
    requiredPermission: 'financial.contracts.create',
    operation: 'create_contrato',
    sensitiveData: true,
    auditDetails: { action: 'create_contract' }
  }
);