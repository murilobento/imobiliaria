import { describe, it, expect } from 'vitest';
import {
  validateField,
  validateObject,
  validateCliente,
  validateImovel,
  validateCidade,
  validateImage,
  validateImages,
  validateImageDimensions,
  sanitizeInput,
  formatValidationErrors,
  validateConfiguracao
} from '../validation';
import { ValidationRule } from '@/types/validation';

describe('Validation Utils', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      const rule: ValidationRule = { required: true };
      
      expect(validateField('name', '', rule)).toHaveLength(1);
      expect(validateField('name', null, rule)).toHaveLength(1);
      expect(validateField('name', undefined, rule)).toHaveLength(1);
      expect(validateField('name', 'valid', rule)).toHaveLength(0);
    });

    it('should validate email format', () => {
      const rule: ValidationRule = { type: 'email' };
      
      expect(validateField('email', 'invalid-email', rule)).toHaveLength(1);
      expect(validateField('email', 'valid@email.com', rule)).toHaveLength(0);
      expect(validateField('email', '', rule)).toHaveLength(0); // Empty is valid if not required
    });

    it('should validate phone format', () => {
      const rule: ValidationRule = { type: 'tel' };
      
      expect(validateField('phone', '123456789', rule)).toHaveLength(1);
      expect(validateField('phone', '(11) 99999-9999', rule)).toHaveLength(0);
      expect(validateField('phone', '(11) 9999-9999', rule)).toHaveLength(0);
    });

    it('should validate number type', () => {
      const rule: ValidationRule = { type: 'number' };
      
      expect(validateField('age', 'not-a-number', rule)).toHaveLength(1);
      expect(validateField('age', '25', rule)).toHaveLength(0);
      expect(validateField('age', 25, rule)).toHaveLength(0);
    });

    it('should validate URL format', () => {
      const rule: ValidationRule = { type: 'url' };
      
      expect(validateField('website', 'not-a-url', rule)).toHaveLength(1);
      expect(validateField('website', 'https://example.com', rule)).toHaveLength(0);
    });

    it('should validate pattern (regex)', () => {
      const rule: ValidationRule = { pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/ };
      
      expect(validateField('cpf', '12345678901', rule)).toHaveLength(1);
      expect(validateField('cpf', '123.456.789-01', rule)).toHaveLength(0);
    });

    it('should validate minimum length', () => {
      const rule: ValidationRule = { minLength: 5 };
      
      expect(validateField('name', 'abc', rule)).toHaveLength(1);
      expect(validateField('name', 'abcde', rule)).toHaveLength(0);
      expect(validateField('name', 'abcdef', rule)).toHaveLength(0);
    });

    it('should validate maximum length', () => {
      const rule: ValidationRule = { maxLength: 10 };
      
      expect(validateField('name', 'this is too long', rule)).toHaveLength(1);
      expect(validateField('name', 'short', rule)).toHaveLength(0);
      expect(validateField('name', 'exactly10c', rule)).toHaveLength(0);
    });

    it('should validate minimum value', () => {
      const rule: ValidationRule = { min: 18 };
      
      expect(validateField('age', '17', rule)).toHaveLength(1);
      expect(validateField('age', '18', rule)).toHaveLength(0);
      expect(validateField('age', '25', rule)).toHaveLength(0);
    });

    it('should validate maximum value', () => {
      const rule: ValidationRule = { max: 100 };
      
      expect(validateField('age', '101', rule)).toHaveLength(1);
      expect(validateField('age', '100', rule)).toHaveLength(0);
      expect(validateField('age', '50', rule)).toHaveLength(0);
    });

    it('should validate enum values', () => {
      const rule: ValidationRule = { enum: ['venda', 'aluguel', 'ambos'] };
      
      expect(validateField('finalidade', 'invalid', rule)).toHaveLength(1);
      expect(validateField('finalidade', 'venda', rule)).toHaveLength(0);
      expect(validateField('finalidade', 'aluguel', rule)).toHaveLength(0);
    });

    it('should validate uniqueness', () => {
      const rule: ValidationRule = { unique: true };
      const existingValues = ['existing@email.com', 'another@email.com'];
      
      expect(validateField('email', 'existing@email.com', rule, existingValues)).toHaveLength(1);
      expect(validateField('email', 'new@email.com', rule, existingValues)).toHaveLength(0);
    });

    it('should combine multiple validation rules', () => {
      const rule: ValidationRule = {
        required: true,
        type: 'email',
        minLength: 5,
        maxLength: 50
      };
      
      // Required validation fails first
      expect(validateField('email', '', rule)).toHaveLength(1);
      
      // Email format validation (should have both minLength and email errors)
      expect(validateField('email', 'abc', rule).length).toBeGreaterThan(0);
      
      // Valid email
      expect(validateField('email', 'valid@email.com', rule)).toHaveLength(0);
    });
  });

  describe('validateObject', () => {
    it('should validate complete object', () => {
      const data = {
        name: 'John',
        email: 'john@email.com',
        age: 25
      };

      const rules = {
        name: { required: true, minLength: 2 },
        email: { required: true, type: 'email' as const },
        age: { required: true, type: 'number' as const, min: 18 }
      };

      const result = validateObject(data, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid object', () => {
      const data = {
        name: '',
        email: 'invalid-email',
        age: 15
      };

      const rules = {
        name: { required: true },
        email: { required: true, type: 'email' as const },
        age: { required: true, type: 'number' as const, min: 18 }
      };

      const result = validateObject(data, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCliente', () => {
    it('should validate valid cliente data', () => {
      const clienteData = {
        nome: 'João Silva',
        email: 'joao@email.com',
        telefone: '(11) 99999-9999',
        cpf_cnpj: '123.456.789-01'
      };

      const result = validateCliente(clienteData);
      expect(result.isValid).toBe(true);
    });

    it('should validate cliente with unique email constraint', () => {
      const clienteData = {
        nome: 'João Silva',
        email: 'existing@email.com'
      };

      const existingEmails = ['existing@email.com'];
      const result = validateCliente(clienteData, existingEmails);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NOT_UNIQUE')).toBe(true);
    });
  });

  describe('validateImovel', () => {
    it('should validate valid imovel for sale', () => {
      const imovelData = {
        nome: 'Casa Bonita',
        tipo: 'Casa',
        finalidade: 'venda',
        valor_venda: 300000,
        quartos: 3,
        banheiros: 2
      };

      const result = validateImovel(imovelData);
      expect(result.isValid).toBe(true);
    });

    it('should require valor_venda for sale properties', () => {
      const imovelData = {
        nome: 'Casa Bonita',
        tipo: 'Casa',
        finalidade: 'venda',
        quartos: 3,
        banheiros: 2
      };

      const result = validateImovel(imovelData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FOR_SALE')).toBe(true);
    });

    it('should require valor_aluguel for rent properties', () => {
      const imovelData = {
        nome: 'Casa Bonita',
        tipo: 'Casa',
        finalidade: 'aluguel',
        quartos: 3,
        banheiros: 2
      };

      const result = validateImovel(imovelData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FOR_RENT')).toBe(true);
    });

    it('should require at least one value for ambos properties', () => {
      const imovelData = {
        nome: 'Casa Bonita',
        tipo: 'Casa',
        finalidade: 'ambos',
        quartos: 3,
        banheiros: 2
      };

      const result = validateImovel(imovelData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_ONE_VALUE')).toBe(true);
    });

    it('should accept ambos with only valor_venda', () => {
      const imovelData = {
        nome: 'Casa Bonita',
        tipo: 'Casa',
        finalidade: 'ambos',
        valor_venda: 300000,
        quartos: 3,
        banheiros: 2
      };

      const result = validateImovel(imovelData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCidade', () => {
    it('should validate valid cidade data', () => {
      const cidadeData = {
        nome: 'São Paulo',
        ativa: true
      };

      const result = validateCidade(cidadeData);
      expect(result.isValid).toBe(true);
    });

    it('should validate cidade with unique name constraint', () => {
      const cidadeData = {
        nome: 'São Paulo',
        ativa: true
      };

      const existingNames = ['São Paulo', 'Rio de Janeiro'];
      const result = validateCidade(cidadeData, existingNames);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NOT_UNIQUE')).toBe(true);
    });
  });

  describe('validateImage', () => {
    it('should validate correct image file', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const errors = validateImage(file);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid file type', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const errors = validateImage(file);
      expect(errors.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true);
    });

    it('should reject file that is too large', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const errors = validateImage(largeFile);
      expect(errors.some(e => e.code === 'FILE_TOO_LARGE')).toBe(true);
    });
  });

  describe('validateImages', () => {
    it('should validate multiple correct images', () => {
      const files = [
        new File([''], 'test1.jpg', { type: 'image/jpeg' }),
        new File([''], 'test2.png', { type: 'image/png' })
      ];

      const result = validateImages(files);
      expect(result.isValid).toBe(true);
    });

    it('should reject too many files', () => {
      const files = Array(25).fill(null).map((_, i) => 
        new File([''], `test${i}.jpg`, { type: 'image/jpeg' })
      );

      const result = validateImages(files);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOO_MANY_FILES')).toBe(true);
    });
  });

  describe('validateImageDimensions', () => {
    it('should validate correct dimensions', () => {
      const errors = validateImageDimensions(800, 600, 'test.jpg');
      expect(errors).toHaveLength(0);
    });

    it('should reject dimensions that are too small', () => {
      const errors = validateImageDimensions(100, 100, 'small.jpg');
      expect(errors.some(e => e.code === 'MIN_WIDTH')).toBe(true);
      expect(errors.some(e => e.code === 'MIN_HEIGHT')).toBe(true);
    });

    it('should reject dimensions that are too large', () => {
      const errors = validateImageDimensions(5000, 5000, 'large.jpg');
      expect(errors.some(e => e.code === 'MAX_WIDTH')).toBe(true);
      expect(errors.some(e => e.code === 'MAX_HEIGHT')).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim string input', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should sanitize array of strings', () => {
      expect(sanitizeInput(['  hello  ', '  world  '])).toEqual(['hello', 'world']);
    });

    it('should sanitize object properties', () => {
      const input = {
        name: '  John  ',
        email: '  john@email.com  '
      };

      const expected = {
        name: 'John',
        email: 'john@email.com'
      };

      expect(sanitizeInput(input)).toEqual(expected);
    });

    it('should handle non-string values', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(true)).toBe(true);
      expect(sanitizeInput(null)).toBe(null);
    });
  });

  describe('validateConfiguracao', () => {
    it('should validate valid configuration data', () => {
      const validData = {
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 5
      };

      const result = validateConfiguracao(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration data for update', () => {
      const partialData = {
        taxa_juros_mensal: 0.015,
        dias_carencia: 7
      };

      const result = validateConfiguracao(partialData, true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid tax rates', () => {
      const invalidData = {
        taxa_juros_mensal: 1.5, // 150% - invalid
        taxa_multa: -0.01, // negative - invalid
        taxa_comissao: 0.10,
        dias_carencia: 5
      };

      const result = validateConfiguracao(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const taxaJurosError = result.errors.find(e => e.field === 'taxa_juros_mensal');
      const taxaMultaError = result.errors.find(e => e.field === 'taxa_multa');
      
      expect(taxaJurosError).toBeDefined();
      expect(taxaMultaError).toBeDefined();
    });

    it('should reject invalid dias_carencia', () => {
      const invalidData = {
        taxa_juros_mensal: 0.01,
        taxa_multa: 0.02,
        taxa_comissao: 0.10,
        dias_carencia: 35 // above limit
      };

      const result = validateConfiguracao(invalidData);
      expect(result.isValid).toBe(false);
      
      const diasCarenciaError = result.errors.find(e => e.field === 'dias_carencia');
      expect(diasCarenciaError).toBeDefined();
    });

    it('should require all fields for creation', () => {
      const incompleteData = {
        taxa_juros_mensal: 0.01
        // missing other required fields
      };

      const result = validateConfiguracao(incompleteData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors by field', () => {
      const errors = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
        { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
        { field: 'name', message: 'Name too short', code: 'MIN_LENGTH' }
      ];

      const formatted = formatValidationErrors(errors);
      
      expect(formatted.name).toEqual(['Name is required', 'Name too short']);
      expect(formatted.email).toEqual(['Invalid email']);
    });

    it('should handle empty errors array', () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toEqual({});
    });
  });
});