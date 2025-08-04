import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processImageSet, validateImage } from '@/lib/utils/imageProcessing';
import { validateImages, validateImageDimensions } from '@/lib/utils/validation';

const STORAGE_BUCKET = 'imoveis-images';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const imovelId = formData.get('imovelId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Nenhuma imagem foi enviada',
          message: 'Pelo menos uma imagem deve ser selecionada'
        },
        { status: 400 }
      );
    }

    if (!imovelId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID do imóvel é obrigatório',
          message: 'ID do imóvel não foi fornecido'
        },
        { status: 400 }
      );
    }

    // Validar todas as imagens usando o sistema de validação
    const validationResult = validateImages(files);
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Imagens inválidas',
          errors: validationResult.errors.map(error => ({
            field: error.field,
            message: error.message
          })),
          message: 'Algumas imagens não atendem aos critérios de validação'
        },
        { status: 400 }
      );
    }

    const uploadResults = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {

        // Converte File para Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Valida a imagem
        const validation = await validateImage(buffer);
        if (!validation.isValid) {
          errors.push({
            index: i,
            filename: file.name,
            error: validation.error || 'Imagem inválida'
          });
          continue;
        }

        // Processa a imagem (redimensiona e cria thumbnail)
        const processedImages = await processImageSet(buffer);

        // Validar dimensões da imagem processada
        const dimensionErrors = validateImageDimensions(
          processedImages.main.originalWidth,
          processedImages.main.originalHeight,
          file.name
        );

        if (dimensionErrors.length > 0) {
          errors.push({
            index: i,
            filename: file.name,
            error: dimensionErrors[0].message
          });
          continue;
        }

        // Gera nomes únicos para os arquivos
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const fileExtension = 'jpg'; // Sempre salva como JPEG após processamento
        
        const mainFileName = `${imovelId}/${timestamp}-${randomId}-main.${fileExtension}`;
        const thumbFileName = `${imovelId}/${timestamp}-${randomId}-thumb.${fileExtension}`;

        // Upload da imagem principal para Supabase Storage
        const { data: mainUpload, error: mainError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(mainFileName, processedImages.main.buffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (mainError) {
          errors.push({
            index: i,
            filename: file.name,
            error: `Erro no upload da imagem principal: ${mainError.message}`
          });
          continue;
        }

        // Upload do thumbnail para Supabase Storage
        const { data: thumbUpload, error: thumbError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbFileName, processedImages.thumbnail.buffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (thumbError) {
          // Se falhar o thumbnail, remove a imagem principal
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([mainFileName]);

          errors.push({
            index: i,
            filename: file.name,
            error: `Erro no upload do thumbnail: ${thumbError.message}`
          });
          continue;
        }

        // Gera URLs públicas
        const { data: mainUrl } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(mainFileName);

        const { data: thumbUrl } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(thumbFileName);

        // Salva informações no banco de dados
        const { data: imageRecord, error: dbError } = await supabase
          .from('imovel_imagens')
          .insert({
            imovel_id: imovelId,
            url: mainUrl.publicUrl,
            url_thumb: thumbUrl.publicUrl,
            storage_path: mainFileName,
            ordem: i,
            tipo: processedImages.main.orientation
          })
          .select()
          .single();

        if (dbError) {
          // Remove arquivos do storage se falhar no banco
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([mainFileName, thumbFileName]);

          errors.push({
            index: i,
            filename: file.name,
            error: `Erro ao salvar no banco de dados: ${dbError.message}`
          });
          continue;
        }

        uploadResults.push({
          index: i,
          filename: file.name,
          id: imageRecord.id,
          url: imageRecord.url,
          url_thumb: imageRecord.url_thumb,
          tipo: imageRecord.tipo,
          ordem: imageRecord.ordem,
          processedWidth: processedImages.main.processedWidth,
          processedHeight: processedImages.main.processedHeight,
          originalWidth: processedImages.main.originalWidth,
          originalHeight: processedImages.main.originalHeight
        });

      } catch (error) {
        errors.push({
          index: i,
          filename: file.name,
          error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      }
    }

    // Retorna resultados
    return NextResponse.json({
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Erro no upload de imagens:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { error: 'ID da imagem é obrigatório' },
        { status: 400 }
      );
    }

    // Busca informações da imagem no banco
    const { data: imageRecord, error: fetchError } = await supabase
      .from('imovel_imagens')
      .select('storage_path, url, url_thumb')
      .eq('id', imageId)
      .single();

    if (fetchError || !imageRecord) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      );
    }

    // Remove arquivos do Supabase Storage
    const filesToRemove = [imageRecord.storage_path];
    
    // Adiciona thumbnail se existir
    if (imageRecord.url_thumb) {
      const thumbPath = imageRecord.storage_path.replace('-main.', '-thumb.');
      filesToRemove.push(thumbPath);
    }

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filesToRemove);

    if (storageError) {
      console.error('Erro ao remover arquivos do storage:', storageError);
      // Continua mesmo com erro no storage para limpar o banco
    }

    // Remove registro do banco de dados
    const { error: dbError } = await supabase
      .from('imovel_imagens')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      return NextResponse.json(
        { error: `Erro ao remover do banco de dados: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Imagem removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}