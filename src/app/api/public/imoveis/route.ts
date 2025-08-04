import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/public/imoveis - Listar imóveis ativos para o site público
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro
    const tipo = searchParams.get('tipo');
    const finalidade = searchParams.get('finalidade');
    const cidade_id = searchParams.get('cidade_id');
    const search = searchParams.get('search');
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Construir query base - apenas imóveis ativos
    let query = supabase
      .from('imoveis')
      .select(`
        id,
        nome,
        tipo,
        finalidade,
        valor_venda,
        valor_aluguel,
        descricao,
        quartos,
        banheiros,
        area_total,
        caracteristicas,
        comodidades,
        endereco_completo,
        bairro,
        destaque,
        created_at,
        cidade:cidades!inner(id, nome),
        cliente:clientes(id, nome),
        imagens:imovel_imagens(id, url, url_thumb, ordem, tipo)
      `)
      .eq('ativo', true)
      .eq('cidades.ativa', true); // Apenas cidades ativas

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
    
    // Busca por nome ou descrição
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Aplicar paginação e ordenação (destaques primeiro)
    query = query
      .order('destaque', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    // Get count separately for accurate pagination
    let countQuery = supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true);

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
    if (search) {
      countQuery = countQuery.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    if (error) {
      console.error('Erro ao buscar imóveis públicos:', error);
      return NextResponse.json(
        { error: 'Erro ao carregar imóveis' },
        { status: 500 }
      );
    }

    // Processar dados para formato público
    const processedData = (data || []).map((imovel: any) => ({
      ...imovel,
      // Ordenar imagens por ordem
      imagens: (imovel.imagens || []).sort((a: any, b: any) => a.ordem - b.ordem)
    }));

    return NextResponse.json({
      success: true,
      data: processedData,
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