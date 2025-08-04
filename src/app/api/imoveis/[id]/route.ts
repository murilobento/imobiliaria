import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { UpdateImovelData } from '@/types/imovel';
import { deleteAllImovelImages } from '@/lib/api/imoveis';
import { validateImovel, sanitizeInput, formatValidationErrors, validateRelationships } from '@/lib/utils/validation';

// GET /api/imoveis/[id] - Buscar imóvel específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do imóvel é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('imoveis')
      .select(`
        *,
        cidade:cidades(id, nome),
        cliente:clientes(id, nome),
        user:user_id (
          id,
          email,
          user_metadata
        ),
        imagens:imovel_imagens(id, url, url_thumb, ordem, tipo)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Imóvel não encontrado' },
          { status: 404 }
        );
      }
      
      console.error('Erro ao buscar imóvel:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar imóvel' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/imoveis/[id] - Atualizar imóvel
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<UpdateImovelData> = await request.json();

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID do imóvel é obrigatório',
          message: 'ID do imóvel não foi fornecido'
        },
        { status: 400 }
      );
    }

    // Verificar se o imóvel existe
    const { data: existingImovel, error: checkError } = await supabase
      .from('imoveis')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingImovel) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Imóvel não encontrado',
          message: 'O imóvel especificado não foi encontrado'
        },
        { status: 404 }
      );
    }

    // Sanitizar dados de entrada
    const sanitizedData = sanitizeInput(body);

    // Validar apenas os campos fornecidos
    const fieldsToValidate: any = {};
    if (sanitizedData.nome !== undefined) fieldsToValidate.nome = sanitizedData.nome;
    if (sanitizedData.tipo !== undefined) fieldsToValidate.tipo = sanitizedData.tipo;
    if (sanitizedData.finalidade !== undefined) fieldsToValidate.finalidade = sanitizedData.finalidade;
    if (sanitizedData.valor_venda !== undefined) fieldsToValidate.valor_venda = sanitizedData.valor_venda;
    if (sanitizedData.valor_aluguel !== undefined) fieldsToValidate.valor_aluguel = sanitizedData.valor_aluguel;
    if (sanitizedData.descricao !== undefined) fieldsToValidate.descricao = sanitizedData.descricao;
    if (sanitizedData.quartos !== undefined) fieldsToValidate.quartos = sanitizedData.quartos;
    if (sanitizedData.banheiros !== undefined) fieldsToValidate.banheiros = sanitizedData.banheiros;
    if (sanitizedData.area_total !== undefined) fieldsToValidate.area_total = sanitizedData.area_total;

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
    const validationResult = validateImovel(fieldsToValidate);

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

    // Validar relacionamentos (cidade e cliente) se fornecidos
    const relationshipValidators: any = {};
    if (sanitizedData.cidade_id !== undefined) {
      relationshipValidators.cidade_id = async (id: string) => {
        if (!id) return true; // Campo opcional
        const { data } = await supabase
          .from('cidades')
          .select('id')
          .eq('id', id)
          .single();
        return !!data;
      };
    }
    if (sanitizedData.cliente_id !== undefined) {
      relationshipValidators.cliente_id = async (id: string) => {
        if (!id) return true; // Campo opcional
        const { data } = await supabase
          .from('clientes')
          .select('id')
          .eq('id', id)
          .single();
        return !!data;
      };
    }

    if (Object.keys(relationshipValidators).length > 0) {
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
    }

    // Preparar dados para atualização (remover campos undefined)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (sanitizedData.nome !== undefined) updateData.nome = sanitizedData.nome;
    if (sanitizedData.tipo !== undefined) updateData.tipo = sanitizedData.tipo;
    if (sanitizedData.finalidade !== undefined) updateData.finalidade = sanitizedData.finalidade;
    if (sanitizedData.valor_venda !== undefined) updateData.valor_venda = sanitizedData.valor_venda || null;
    if (sanitizedData.valor_aluguel !== undefined) updateData.valor_aluguel = sanitizedData.valor_aluguel || null;
    if (sanitizedData.descricao !== undefined) updateData.descricao = sanitizedData.descricao || null;
    if (sanitizedData.quartos !== undefined) updateData.quartos = sanitizedData.quartos || 0;
    if (sanitizedData.banheiros !== undefined) updateData.banheiros = sanitizedData.banheiros || 0;
    if (sanitizedData.area_total !== undefined) updateData.area_total = sanitizedData.area_total || null;
    if (sanitizedData.caracteristicas !== undefined) updateData.caracteristicas = sanitizedData.caracteristicas || [];
    if (sanitizedData.comodidades !== undefined) updateData.comodidades = sanitizedData.comodidades || [];
    if (sanitizedData.endereco_completo !== undefined) updateData.endereco_completo = sanitizedData.endereco_completo || null;
    if (sanitizedData.cidade_id !== undefined) updateData.cidade_id = sanitizedData.cidade_id || null;
    if (sanitizedData.bairro !== undefined) updateData.bairro = sanitizedData.bairro || null;
    if (sanitizedData.destaque !== undefined) updateData.destaque = sanitizedData.destaque;
    if (sanitizedData.cliente_id !== undefined) updateData.cliente_id = sanitizedData.cliente_id || null;
    if (sanitizedData.ativo !== undefined) updateData.ativo = sanitizedData.ativo;

    const { data, error } = await supabase
      .from('imoveis')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar imóvel:', error);
      
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
          error: 'Erro ao atualizar imóvel',
          message: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Imóvel atualizado com sucesso'
    });

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

// DELETE /api/imoveis/[id] - Excluir imóvel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do imóvel é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o imóvel existe
    const { data: existingImovel, error: checkError } = await supabase
      .from('imoveis')
      .select('id, nome')
      .eq('id', id)
      .single();

    if (checkError || !existingImovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      );
    }

    // Remover todas as imagens associadas primeiro
    try {
      await deleteAllImovelImages(id);
    } catch (imageError) {
      console.error('Erro ao remover imagens do imóvel:', imageError);
      // Continua com a exclusão do imóvel mesmo se houver erro nas imagens
    }

    // Excluir o imóvel (as imagens serão removidas automaticamente por CASCADE)
    const { error } = await supabase
      .from('imoveis')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir imóvel:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir imóvel' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Imóvel excluído com sucesso',
      id: id,
      nome: existingImovel.nome
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}