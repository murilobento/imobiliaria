import {
  detectImageOrientation,
  calculateDimensions,
  validateImage,
  processImage,
  generateThumbnail,
  processImageSet,
  IMAGE_CONFIGS
} from '../imageProcessing';
import sharp from 'sharp';

describe('Image Processing Utils', () => {
  // Criar uma imagem de teste
  const createTestImage = async (width: number, height: number): Promise<Buffer> => {
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .jpeg()
    .toBuffer();
  };

  describe('detectImageOrientation', () => {
    it('should detect portrait orientation', () => {
      expect(detectImageOrientation(400, 600)).toBe('retrato');
      expect(detectImageOrientation(300, 500)).toBe('retrato');
    });

    it('should detect landscape orientation', () => {
      expect(detectImageOrientation(800, 500)).toBe('paisagem');
      expect(detectImageOrientation(600, 400)).toBe('paisagem');
    });

    it('should detect square as landscape', () => {
      expect(detectImageOrientation(500, 500)).toBe('paisagem');
    });
  });

  describe('calculateDimensions', () => {
    it('should maintain aspect ratio when scaling down', () => {
      const result = calculateDimensions(1600, 1000, 800, 500);
      expect(result.width).toBe(800);
      expect(result.height).toBe(500);
    });

    it('should handle portrait images correctly', () => {
      const result = calculateDimensions(600, 900, 400, 600);
      expect(result.width).toBe(400);
      expect(result.height).toBe(600);
    });

    it('should limit by width for wide images', () => {
      const result = calculateDimensions(2000, 800, 800, 500);
      expect(result.width).toBe(800);
      expect(result.height).toBe(320); // 800 * (800/2000)
    });

    it('should limit by height for tall images', () => {
      const result = calculateDimensions(800, 2000, 800, 500);
      expect(result.width).toBe(200); // 500 * (800/2000)
      expect(result.height).toBe(500);
    });
  });

  describe('validateImage', () => {
    it('should validate a correct image', async () => {
      const imageBuffer = await createTestImage(800, 600);
      const result = await validateImage(imageBuffer);
      
      expect(result.isValid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.width).toBe(800);
      expect(result.metadata?.height).toBe(600);
    });

    it('should reject images that are too small', async () => {
      const imageBuffer = await createTestImage(100, 100);
      const result = await validateImage(imageBuffer);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('muito pequena');
    });

    it('should reject images that are too large', async () => {
      const imageBuffer = await createTestImage(5000, 5000);
      const result = await validateImage(imageBuffer);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('muito grande');
    });

    it('should reject invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');
      const result = await validateImage(invalidBuffer);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('processImage', () => {
    it('should process landscape image correctly', async () => {
      const imageBuffer = await createTestImage(1600, 1000);
      const result = await processImage(imageBuffer, 'paisagem');
      
      expect(result.orientation).toBe('paisagem');
      expect(result.originalWidth).toBe(1600);
      expect(result.originalHeight).toBe(1000);
      expect(result.processedWidth).toBe(IMAGE_CONFIGS.paisagem.width);
      expect(result.processedHeight).toBe(IMAGE_CONFIGS.paisagem.height);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should process portrait image correctly', async () => {
      const imageBuffer = await createTestImage(600, 900);
      const result = await processImage(imageBuffer, 'retrato');
      
      expect(result.orientation).toBe('retrato');
      expect(result.originalWidth).toBe(600);
      expect(result.originalHeight).toBe(900);
      expect(result.processedWidth).toBe(IMAGE_CONFIGS.retrato.width);
      expect(result.processedHeight).toBe(IMAGE_CONFIGS.retrato.height);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail with correct dimensions', async () => {
      const imageBuffer = await createTestImage(1600, 1000);
      const result = await generateThumbnail(imageBuffer);
      
      expect(result.orientation).toBe('paisagem');
      expect(result.originalWidth).toBe(1600);
      expect(result.originalHeight).toBe(1000);
      expect(result.processedWidth).toBe(IMAGE_CONFIGS.thumbnail.width);
      expect(result.processedHeight).toBe(125); // Mantém proporção: 200 * (1000/1600)
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('processImageSet', () => {
    it('should process complete image set', async () => {
      const imageBuffer = await createTestImage(1600, 1000);
      const result = await processImageSet(imageBuffer);
      
      expect(result.main).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.main.orientation).toBe('paisagem');
      expect(result.main.buffer).toBeInstanceOf(Buffer);
      expect(result.thumbnail.buffer).toBeInstanceOf(Buffer);
    });

    it('should detect portrait orientation correctly', async () => {
      const imageBuffer = await createTestImage(600, 900);
      const result = await processImageSet(imageBuffer);
      
      expect(result.main.orientation).toBe('retrato');
      expect(result.main.processedWidth).toBe(IMAGE_CONFIGS.retrato.width);
      expect(result.main.processedHeight).toBe(IMAGE_CONFIGS.retrato.height);
    });
  });
});