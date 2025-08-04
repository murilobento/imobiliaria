import { NextRequest, NextResponse } from 'next/server'
import { getPagamentosList, createPagamento, checkContratoExists } from '../../../lib/api/pagamentos'
import { CreatePagamentoData, PagamentoFilters } from '../../../types/financeiro'
import { validatePagamento, sanitizeInput, formatValidationErrors } from '../../../lib/utils/validation'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

// GET /api/pagamentos - Listar pagamentos com paginação e filtros
export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const { searchParams } = new URL(request.url)
      
      // Parâmetros de paginação
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '10')
      const search = searchParams.get('search') || ''
      const orderBy = (searchParams.get('orderBy') as 'valor_devido' | 'data_vencimento' | 'data_pagamento' | 'created_at') || 'data_vencimento'
      const orderDirection = (searchParams.get('orderDirection') as 'asc' | 'desc') || 'desc'

      // Filtros específicos
      const filters: PagamentoFilters = {}
      if (searchParams.get('status')) {
        filters.status = searchParams.get('status') as any
      }
      if (searchParams.get('contrato_id')) {
        filters.contrato_id = searchParams.get('contrato_id')!
      }
      if (searchParams.get('mes_referencia')) {
        filters.mes_referencia = searchParams.get('mes_referencia')!
      }
      if (searchParams.get('data_vencimento_inicio')) {
        filters.data_vencimento_inicio = searchParams.get('data_vencimento_inicio')!
      }
      if (searchParams.get('data_vencimento_fim')) {
        filters.data_vencimento_fim = searchParams.get('data_vencimento_fim')!
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

      const result = await getPagamentosList(params)
      
      // Log audit trail for data access
      await logFinancialAudit(
        'pagamentos_list',
        'view',
        auditData,
        {
          entityType: 'pagamentos',
          affectedRecords: result.data?.length || 0,
          newValues: { filters, pagination: { page, limit } }
        }
      );
      
      return NextResponse.json(result)
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
  {
    requiredPermission: 'financial.payments.view',
    operation: 'list_pagamentos',
    auditDetails: { action: 'list_payments' }
  }
);

// POST /api/pagamentos - Criar novo pagamento
export const POST = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const body = await request.json()
      
      // Sanitizar dados de entrada
      const sanitizedData = sanitizeInput(body)
      
      // Validar dados usando o sistema de validação
      const validationResult = validatePagamento(sanitizedData)
      
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

      // Verificar se o contrato existe
      const contratoExists = await checkContratoExists(sanitizedData.contrato_id)
      if (!contratoExists) {
        return NextResponse.json(
          { 
            error: 'Contrato não encontrado',
            message: 'O contrato especificado não foi encontrado'
          },
          { status: 404 }
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

      const pagamentoData: CreatePagamentoData = {
        contrato_id: sanitizedData.contrato_id,
        mes_referencia: sanitizedData.mes_referencia,
        valor_devido: parseFloat(sanitizedData.valor_devido),
        valor_pago: sanitizedData.valor_pago ? parseFloat(sanitizedData.valor_pago) : undefined,
        data_vencimento: sanitizedData.data_vencimento,
        data_pagamento: sanitizedData.data_pagamento || undefined,
        valor_juros: sanitizedData.valor_juros ? parseFloat(sanitizedData.valor_juros) : 0,
        valor_multa: sanitizedData.valor_multa ? parseFloat(sanitizedData.valor_multa) : 0,
        status: sanitizedData.status || 'pendente',
        observacoes: sanitizedData.observacoes || undefined
      }

      const pagamento = await createPagamento(pagamentoData)
      
      // Log audit trail for payment creation
      await logFinancialAudit(
        'pagamento_create',
        'create',
        auditData,
        {
          entityType: 'pagamento',
          entityId: pagamento.id,
          newValues: {
            contrato_id: pagamentoData.contrato_id,
            valor_devido: pagamentoData.valor_devido,
            valor_pago: pagamentoData.valor_pago,
            data_vencimento: pagamentoData.data_vencimento,
            status: pagamentoData.status
          }
        }
      );
      
      return NextResponse.json({
        success: true,
        data: pagamento,
        message: 'Pagamento registrado com sucesso'
      }, { status: 201 })
    } catch (error) {
      console.error('Erro ao criar pagamento:', error)
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
    requiredPermission: 'financial.payments.create',
    operation: 'create_pagamento',
    sensitiveData: true,
    auditDetails: { action: 'create_payment' }
  }
);