import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateDespesa, sanitizeInput, validateRelationships, formatValidationErrors } from '@/lib/utils/validation'
import { CreateDespesaData, DespesaFilters } from '@/types/financeiro'
import { checkImovelExists } from '@/lib/api/despesas'
import { withFinancialSecurity, logFinancialAudit } from '@/lib/auth/financialSecurityMiddleware'

export const GET = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const supabase = await createServerSupabaseClient()
      const { searchParams } = new URL(request.url)
      
      // Parâmetros de paginação
      const page = parseInt(searchParams.get('page') || '1')
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Máximo 100 por página
      
      // Parâmetros de busca e ordenação
      const search = searchParams.get('search') || ''
      const orderBy = searchParams.get('orderBy') || 'created_at'
      const orderDirection = searchParams.get('orderDirection') || 'desc'
      
      // Filtros
      const filters: DespesaFilters = {}
      if (searchParams.get('status')) filters.status = searchParams.get('status') as any
      if (searchParams.get('categoria')) filters.categoria = searchParams.get('categoria') as any
      if (searchParams.get('imovel_id')) filters.imovel_id = searchParams.get('imovel_id')!
      if (searchParams.get('data_inicio')) filters.data_inicio = searchParams.get('data_inicio')!
      if (searchParams.get('data_fim')) filters.data_fim = searchParams.get('data_fim')!
      if (searchParams.get('valor_min')) filters.valor_min = parseFloat(searchParams.get('valor_min')!)
      if (searchParams.get('valor_max')) filters.valor_max = parseFloat(searchParams.get('valor_max')!)

      // Construir query
      let query = supabase
        .from('despesas_imoveis')
        .select(`
          *,
          imovel:imoveis(*)
        `, { count: 'exact' })

      // Aplicar busca se fornecida
      if (search) {
        query = query.or(`descricao.ilike.%${search}%,observacoes.ilike.%${search}%`)
      }

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria)
      }
      if (filters.imovel_id) {
        query = query.eq('imovel_id', filters.imovel_id)
      }
      if (filters.data_inicio) {
        query = query.gte('data_despesa', filters.data_inicio)
      }
      if (filters.data_fim) {
        query = query.lte('data_despesa', filters.data_fim)
      }
      if (filters.valor_min) {
        query = query.gte('valor', filters.valor_min)
      }
      if (filters.valor_max) {
        query = query.lte('valor', filters.valor_max)
      }

      // Aplicar ordenação
      const validOrderFields = ['valor', 'data_despesa', 'data_pagamento', 'created_at']
      const finalOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'created_at'
      const finalOrderDirection = orderDirection === 'asc' ? 'asc' : 'desc'
      
      query = query.order(finalOrderBy, { ascending: finalOrderDirection === 'asc' })

      // Aplicar paginação
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Erro ao buscar despesas:', error)
        return NextResponse.json(
          { error: 'Erro interno do servidor' },
          { status: 500 }
        )
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      // Log audit trail for data access
      await logFinancialAudit(
        'despesas_list',
        'view',
        auditData,
        {
          entityType: 'despesas',
          affectedRecords: data?.length || 0,
          newValues: { filters, pagination: { page, limit } }
        }
      );

      return NextResponse.json({
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      })

    } catch (error) {
      console.error('Erro na API de despesas:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
  {
    requiredPermission: 'financial.expenses.view',
    operation: 'list_despesas',
    auditDetails: { action: 'list_expenses' }
  }
);

export const POST = withFinancialSecurity(
  async (request: NextRequest, user: any, auditData: any) => {
    try {
      const supabase = await createServerSupabaseClient()
      const body = await request.json()
      const sanitizedData = sanitizeInput(body)

      // Validar dados de entrada
      const validation = validateDespesa(sanitizedData)
      if (!validation.isValid) {
        return NextResponse.json(
          { 
            error: 'Dados inválidos',
            details: formatValidationErrors(validation.errors)
          },
          { status: 400 }
        )
      }

      // Validar relacionamentos
      const relationshipErrors = await validateRelationships(sanitizedData, {
        imovel_id: checkImovelExists
      })

      if (relationshipErrors.length > 0) {
        return NextResponse.json(
          { 
            error: 'Dados inválidos',
            details: formatValidationErrors(relationshipErrors)
          },
          { status: 400 }
        )
      }

      // Preparar dados para inserção
      const despesaData: CreateDespesaData = {
        imovel_id: sanitizedData.imovel_id,
        categoria: sanitizedData.categoria,
        descricao: sanitizedData.descricao,
        valor: parseFloat(sanitizedData.valor),
        data_despesa: sanitizedData.data_despesa,
        data_pagamento: sanitizedData.data_pagamento || null,
        status: sanitizedData.status || 'pendente',
        observacoes: sanitizedData.observacoes || null,
        user_id: user.id // Use authenticated user ID
      }

      // Inserir no banco de dados
      const { data, error } = await supabase
        .from('despesas_imoveis')
        .insert([despesaData])
        .select(`
          *,
          imovel:imoveis(*)
        `)
        .single()

      if (error) {
        console.error('Erro ao criar despesa:', error)
        
        // Tratar erros específicos do banco
        if (error.code === '23503') {
          return NextResponse.json(
            { error: 'Imóvel não encontrado' },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: 'Erro ao criar despesa' },
          { status: 500 }
        )
      }

      // Log audit trail for expense creation
      await logFinancialAudit(
        'despesa_create',
        'create',
        auditData,
        {
          entityType: 'despesa',
          entityId: data.id,
          newValues: {
            imovel_id: despesaData.imovel_id,
            categoria: despesaData.categoria,
            valor: despesaData.valor,
            data_despesa: despesaData.data_despesa,
            status: despesaData.status
          }
        }
      );

      return NextResponse.json(data, { status: 201 })

    } catch (error) {
      console.error('Erro na API de criação de despesa:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
  {
    requiredPermission: 'financial.expenses.create',
    operation: 'create_despesa',
    sensitiveData: true,
    auditDetails: { action: 'create_expense' }
  }
);