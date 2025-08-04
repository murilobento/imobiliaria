import sharp from 'sharp';

// Configurações de imagem conforme especificado no design
export const IMAGE_CONFIGS = {
  retrato: {
    width: 400,
    height: 600,
    quality: 85
  },
  paisagem: {
    width: 800,
    height: 500,
    quality: 85
  },
  thumbnail: {
    width: 200,
    height: 150,
    quality: 70
  }
} as const;

export type ImageOrientation = 'retrato' | 'paisagem';

export interface ProcessedImage {
  buffer: Buffer;
  orientation: ImageOrientation;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
}

export interface ProcessedImageSet {
  main: ProcessedImage;
  thumbnail: ProcessedImage;
}

/**
 * Detecta a orientação da imagem baseada nas dimensões
 */
export function detectImageOrientation(width: number, height: number): ImageOrientation {
  return height > width ? 'retrato' : 'paisagem';
}

/**
 * Calcula as dimensões finais mantendo a proporção
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  const targetAspectRatio = targetWidth / targetHeight;

  let finalWidth: number;
  let finalHeight: number;

  if (aspectRatio > targetAspectRatio) {
    // Imagem mais larga - limitar pela largura
    finalWidth = targetWidth;
    finalHeight = Math.round(targetWidth / aspectRatio);
  } else {
    // Imagem mais alta - limitar pela altura
    finalHeight = targetHeight;
    finalWidth = Math.round(targetHeight * aspectRatio);
  }

  return { width: finalWidth, height: finalHeight };
}

/**
 * Processa uma imagem individual redimensionando e otimizando
 */
export async function processImage(
  imageBuffer: Buffer,
  orientation: ImageOrientation,
  quality: number = IMAGE_CONFIGS[orientation].quality
): Promise<ProcessedImage> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Não foi possível obter as dimensões da imagem');
  }

  const config = IMAGE_CONFIGS[orientation];
  const dimensions = calculateDimensions(
    metadata.width,
    metadata.height,
    config.width,
    config.height
  );

  const processedBuffer = await image
    .resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality })
    .toBuffer();

  return {
    buffer: processedBuffer,
    orientation,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    processedWidth: dimensions.width,
    processedHeight: dimensions.height
  };
}

/**
 * Gera thumbnail de uma imagem
 */
export async function generateThumbnail(imageBuffer: Buffer): Promise<ProcessedImage> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Não foi possível obter as dimensões da imagem para thumbnail');
  }

  const config = IMAGE_CONFIGS.thumbnail;
  const dimensions = calculateDimensions(
    metadata.width,
    metadata.height,
    config.width,
    config.height
  );

  const thumbnailBuffer = await image
    .resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: config.quality })
    .toBuffer();

  // Para thumbnail, sempre consideramos como paisagem para fins de configuração
  return {
    buffer: thumbnailBuffer,
    orientation: 'paisagem',
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    processedWidth: dimensions.width,
    processedHeight: dimensions.height
  };
}

/**
 * Processa uma imagem completa (principal + thumbnail)
 */
export async function processImageSet(imageBuffer: Buffer): Promise<ProcessedImageSet> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Não foi possível obter as dimensões da imagem');
  }

  // Detecta orientação
  const orientation = detectImageOrientation(metadata.width, metadata.height);

  // Processa imagem principal
  const mainImage = await processImage(imageBuffer, orientation);

  // Gera thumbnail
  const thumbnail = await generateThumbnail(imageBuffer);

  return {
    main: mainImage,
    thumbnail
  };
}

/**
 * Valida se o arquivo é uma imagem válida
 */
export async function validateImage(imageBuffer: Buffer): Promise<{
  isValid: boolean;
  error?: string;
  metadata?: sharp.Metadata;
}> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Verifica se é uma imagem válida
    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Arquivo não é uma imagem válida'
      };
    }

    // Verifica formatos suportados
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!metadata.format || !supportedFormats.includes(metadata.format)) {
      return {
        isValid: false,
        error: `Formato não suportado. Use: ${supportedFormats.join(', ')}`
      };
    }

    // Verifica dimensões mínimas
    const minWidth = 200;
    const minHeight = 200;
    if (metadata.width < minWidth || metadata.height < minHeight) {
      return {
        isValid: false,
        error: `Imagem muito pequena. Mínimo: ${minWidth}x${minHeight}px`
      };
    }

    // Verifica dimensões máximas
    const maxWidth = 4000;
    const maxHeight = 4000;
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      return {
        isValid: false,
        error: `Imagem muito grande. Máximo: ${maxWidth}x${maxHeight}px`
      };
    }

    return {
      isValid: true,
      metadata
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Erro ao processar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Processa múltiplas imagens em lote com processamento paralelo
 */
export async function processMultipleImages(
  imageBuffers: Buffer[],
  options: {
    maxConcurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<{
  processed: ProcessedImageSet[];
  errors: { index: number; error: string }[];
}> {
  const { maxConcurrency = 3, onProgress } = options;
  const processed: ProcessedImageSet[] = [];
  const errors: { index: number; error: string }[] = [];
  let completed = 0;

  // Process images in batches for better performance
  const processBatch = async (batch: { buffer: Buffer; index: number }[]) => {
    const promises = batch.map(async ({ buffer, index }) => {
      try {
        const validation = await validateImage(buffer);
        if (!validation.isValid) {
          errors.push({ index, error: validation.error || 'Imagem inválida' });
          return null;
        }

        const processedSet = await processImageSet(buffer);
        return { processedSet, index };
      } catch (error) {
        errors.push({
          index,
          error: `Erro ao processar imagem ${index + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
        return null;
      } finally {
        completed++;
        onProgress?.(completed, imageBuffers.length);
      }
    });

    const results = await Promise.all(promises);
    
    // Add successful results to processed array in correct order
    results.forEach((result) => {
      if (result) {
        processed[result.index] = result.processedSet;
      }
    });
  };

  // Split into batches
  const batches: { buffer: Buffer; index: number }[][] = [];
  for (let i = 0; i < imageBuffers.length; i += maxConcurrency) {
    const batch = imageBuffers
      .slice(i, i + maxConcurrency)
      .map((buffer, batchIndex) => ({ buffer, index: i + batchIndex }));
    batches.push(batch);
  }

  // Process batches sequentially to control memory usage
  for (const batch of batches) {
    await processBatch(batch);
  }

  // Filter out undefined entries and maintain order
  const orderedProcessed = processed.filter(Boolean);

  return { processed: orderedProcessed, errors };
}

/**
 * Otimiza imagem para web com diferentes qualidades
 */
export async function optimizeImageForWeb(
  imageBuffer: Buffer,
  options: {
    quality?: number;
    progressive?: boolean;
    mozjpeg?: boolean;
  } = {}
): Promise<Buffer> {
  const { quality = 85, progressive = true, mozjpeg = true } = options;

  const image = sharp(imageBuffer);
  
  return await image
    .jpeg({ 
      quality,
      progressive,
      mozjpeg
    })
    .toBuffer();
}

/**
 * Gera WebP version para browsers modernos
 */
export async function generateWebPVersion(imageBuffer: Buffer): Promise<Buffer> {
  return await sharp(imageBuffer)
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}

/**
 * Cache de imagens processadas em memória (para desenvolvimento)
 */
const imageCache = new Map<string, ProcessedImageSet>();

export async function processImageWithCache(
  imageBuffer: Buffer,
  cacheKey?: string
): Promise<ProcessedImageSet> {
  if (cacheKey && imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  const processed = await processImageSet(imageBuffer);
  
  if (cacheKey) {
    // Limit cache size to prevent memory issues
    if (imageCache.size >= 50) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) {
        imageCache.delete(firstKey);
      }
    }
    imageCache.set(cacheKey, processed);
  }

  return processed;
}

/**
 * Limpa cache de imagens
 */
export function clearImageCache(): void {
  imageCache.clear();
}