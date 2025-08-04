import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/public/cidades - Listar cidades ativas para seletor público
export async function GET() {
  try {
    const { data: cidades, error } = await supabase
      .from('cidades')
      .select('id, nome')
      .eq('ativa', true)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar cidades públicas:', error);
      return NextResponse.json(
        { error: 'Erro ao carregar cidades' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      data: cidades || [] 
    });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}