import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/public/imoveis/destaque - Listar imóveis em destaque para o site
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parâmetros opcionais
    const limit = parseInt(searchParams.get('limit') || '6'); // Padrão 6 imóveis em destaque
    const tipo = searchParams.get('tipo');
    const cidade_id = searchParams.get('cidade_id');

    // Construir query base - apenas imóveis ativos e em destaque
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
      .eq('destaque', true)
      .eq('cidades.ativa', true); // Apenas cidades ativas

    // Aplicar filtros opcionais
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    if (cidade_id) {
      query = query.eq('cidade_id', cidade_id);
    }

    // Aplicar limite e ordenação (mais recentes primeiro)
    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar imóveis em destaque:', error);
      return NextResponse.json(
        { error: 'Erro ao carregar imóveis em destaque' },
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
      total: processedData.length
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}