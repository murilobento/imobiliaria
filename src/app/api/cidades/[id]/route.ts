import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { UpdateCidadeData } from '@/types/cidade';
import { validateCidade, sanitizeInput, formatValidationErrors } from '@/lib/utils/validation';

// GET /api/cidades/[id] - Buscar cidade específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da cidade é obrigatório' },
        { status: 400 }
      );
    }

    const { data: cidade, error } = await supabase
      .from('cidades')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cidade não encontrada' },
          { status: 404 }
        );
      }
      console.error('Erro ao buscar cidade:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cidade });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/cidades/[id] - Atualizar cidade
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<UpdateCidadeData> = await request.json();

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID da cidade é obrigatório',
          message: 'ID da cidade não foi fornecido'
        },
        { status: 400 }
      );
    }

    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body);

    // Verificar nomes existentes para validação de unicidade (excluindo a cidade atual)
    const existingNames: string[] = [];
    if (sanitizedData.nome) {
      const { data: existingCidade } = await supabase
        .from('cidades')
        .select('id')
        .eq('nome', sanitizedData.nome)
        .neq('id', id)
        .single();

      if (existingCidade) {
        existingNames.push(sanitizedData.nome);
      }
    }

    // Validar apenas os campos fornecidos
    const fieldsToValidate: any = {};
    if (sanitizedData.nome !== undefined) fieldsToValidate.nome = sanitizedData.nome;
    if (sanitizedData.ativa !== undefined) fieldsToValidate.ativa = sanitizedData.ativa;

    if (Object.keys(fieldsToValidate).length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Nenhum campo válido fornecido para atualização',
          message: 'Pelo menos um campo deve ser fornecido para atualização'
        },
        { status: 400 }
      );
    }

    // Validar dados usando o sistema de validação
    const validationResult = validateCidade(fieldsToValidate, existingNames);

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

    // Preparar dados para atualização
    const updateData: { nome?: string; ativa?: boolean } = {};
    if (sanitizedData.nome !== undefined) updateData.nome = sanitizedData.nome;
    if (sanitizedData.ativa !== undefined) updateData.ativa = sanitizedData.ativa;

    // Atualizar a cidade
    const { data: cidade, error } = await supabase
      .from('cidades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Cidade não encontrada',
            message: 'A cidade especificada não foi encontrada'
          },
          { status: 404 }
        );
      }
      console.error('Erro ao atualizar cidade:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro ao atualizar cidade',
          message: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cidade,
      message: 'Cidade atualizada com sucesso'
    });
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

// DELETE /api/cidades/[id] - Excluir cidade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da cidade é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se existem imóveis vinculados a esta cidade
    const { data: imoveis, error: imoveisError } = await supabase
      .from('imoveis')
      .select('id')
      .eq('cidade_id', id)
      .limit(1);

    if (imoveisError) {
      console.error('Erro ao verificar vínculos:', imoveisError);
      return NextResponse.json(
        { error: 'Erro ao verificar vínculos da cidade' },
        { status: 500 }
      );
    }

    if (imoveis && imoveis.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir a cidade pois existem imóveis vinculados a ela' },
        { status: 409 }
      );
    }

    // Excluir a cidade
    const { error } = await supabase
      .from('cidades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir cidade:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir cidade' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Cidade excluída com sucesso' });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}