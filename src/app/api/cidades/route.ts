import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateCidadeData } from '@/types/cidade';
import { validateCidade, sanitizeInput, formatValidationErrors } from '@/lib/utils/validation';

// GET /api/cidades - Listar todas as cidades
export async function GET() {
  try {
    const { data: cidades, error } = await supabase
      .from('cidades')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar cidades:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cidades });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/cidades - Criar nova cidade
export async function POST(request: NextRequest) {
  try {
    const body: CreateCidadeData = await request.json();

    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body);

    // Verificar nomes existentes para validação de unicidade
    const existingNames: string[] = [];
    if (sanitizedData.nome) {
      const { data: existingCidade } = await supabase
        .from('cidades')
        .select('id')
        .eq('nome', sanitizedData.nome)
        .single();

      if (existingCidade) {
        existingNames.push(sanitizedData.nome);
      }
    }

    // Validar dados usando o sistema de validação
    const validationResult = validateCidade(sanitizedData, existingNames);

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

    // Criar a cidade
    const { data: cidade, error } = await supabase
      .from('cidades')
      .insert({
        nome: sanitizedData.nome,
        ativa: sanitizedData.ativa ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar cidade:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro ao criar cidade',
          message: 'Ocorreu um erro ao salvar a cidade. Tente novamente.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cidade,
      message: 'Cidade criada com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro inesperado:', error);
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