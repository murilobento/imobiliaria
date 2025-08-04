import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Imovel, CreateImovelData } from '@/types/imovel';
import { validateImovel, sanitizeInput, formatValidationErrors, validateRelationships } from '@/lib/utils/validation';
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils';

// GET /api/imoveis - Listar imóveis com filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro
    const tipo = searchParams.get('tipo');
    const finalidade = searchParams.get('finalidade');
    const cidade_id = searchParams.get('cidade_id');
    const destaque = searchParams.get('destaque');
    const ativo = searchParams.get('ativo') || 'true';
    const search = searchParams.get('search');
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Construir query base com relacionamentos
    let query = supabase
      .from('imoveis')
      .select(`
        *,
        cidade:cidades(id, nome),
        cliente:clientes(id, nome),
        imagens:imovel_imagens(id, url, url_thumb, ordem, tipo)
      `)
      .eq('ativo', ativo === 'true');

    // Aplicar filtros
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    if (finalidade) {
      query = query.eq('finalidade', finalidade);
    }
    
    if (cidade_id) {
      query = query.eq('cidade_id', cidade_id);
    }
    
    if (destaque) {
      query = query.eq('destaque', destaque === 'true');
    }
    
    // Busca por nome ou descrição
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Aplicar paginação e ordenação
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    // Get count separately for accurate pagination with joins
    let countQuery = supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', ativo === 'true');

    // Apply same filters to count query
    if (tipo) {
      countQuery = countQuery.eq('tipo', tipo);
    }
    if (finalidade) {
      countQuery = countQuery.eq('finalidade', finalidade);
    }
    if (cidade_id) {
      countQuery = countQuery.eq('cidade_id', cidade_id);
    }
    if (destaque) {
      countQuery = countQuery.eq('destaque', destaque === 'true');
    }
    if (search) {
      countQuery = countQuery.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    if (error) {
      console.error('Erro ao buscar imóveis:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar imóveis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/imoveis - Criar novo imóvel
export async function POST(request: NextRequest) {
  try {
    // Autenticar usuário
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Não autorizado',
          message: 'Você precisa estar logado para criar imóveis'
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
          message: 'Você não tem permissão para criar imóveis'
        },
        { status: 403 }
      );
    }

    const body: CreateImovelData = await request.json();

    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body);

    // Validar dados usando o sistema de validação
    const validationResult = validateImovel(sanitizedData);

    if (!validationResult.isValid) {
      const formattedErrors = formatValidationErrors(validationResult.errors);
      return NextResponse.json(
        { 
          success: false,
          error: 'Dados inválidos',
          errors: formattedErrors,
          message: 'Por favor, corrija os erros nos campos indicados'
        },
        { status: 400 }
      );
    }

    // Validar relacionamentos (cidade e cliente)
    const relationshipValidators = {
      cidade_id: async (id: string) => {
        if (!id) return true; // Campo opcional
        const { data } = await supabase
          .from('cidades')
          .select('id')
          .eq('id', id)
          .single();
        return !!data;
      },
      cliente_id: async (id: string) => {
        if (!id) return true; // Campo opcional
        const { data } = await supabase
          .from('clientes')
          .select('id')
          .eq('id', id)
          .single();
        return !!data;
      }
    };

    const relationshipErrors = await validateRelationships(sanitizedData, relationshipValidators);
    
    if (relationshipErrors.length > 0) {
      const formattedErrors = formatValidationErrors(relationshipErrors);
      return NextResponse.json(
        { 
          success: false,
          error: 'Relacionamentos inválidos',
          errors: formattedErrors,
          message: 'Verifique se a cidade e cliente selecionados existem'
        },
        { status: 400 }
      );
    }

    // Preparar dados para inserção
    const imovelData = {
      nome: sanitizedData.nome,
      tipo: sanitizedData.tipo,
      finalidade: sanitizedData.finalidade,
      valor_venda: sanitizedData.valor_venda || null,
      valor_aluguel: sanitizedData.valor_aluguel || null,
      descricao: sanitizedData.descricao || null,
      quartos: sanitizedData.quartos || 0,
      banheiros: sanitizedData.banheiros || 0,
      area_total: sanitizedData.area_total || null,
      caracteristicas: sanitizedData.caracteristicas || [],
      comodidades: sanitizedData.comodidades || [],
      endereco_completo: sanitizedData.endereco_completo || null,
      cidade_id: sanitizedData.cidade_id || null,
      bairro: sanitizedData.bairro || null,
      destaque: sanitizedData.destaque || false,
      cliente_id: sanitizedData.cliente_id || null,
      // user_id: authResult.user!.id, // TODO: Adicionar após criar coluna no banco
      ativo: sanitizedData.ativo !== undefined ? sanitizedData.ativo : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('imoveis')
      .insert(imovelData)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar imóvel:', error);
      
      // Tratar erros específicos
      if (error.code === '23503') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Relacionamento inválido',
            message: 'Cidade ou cliente não encontrado'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro ao criar imóvel',
          message: 'Ocorreu um erro ao salvar o imóvel. Tente novamente.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Imóvel criado com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado. Tente novamente.'
      },
      { status: 500 }
    );
  }
}