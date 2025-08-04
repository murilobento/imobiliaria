/**
 * Tests for database setup utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateSecurePassword, validatePasswordStrength, validateEnvironmentConfig } from '../database-setup';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Database Setup Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length of 16 characters', () => {
      const password = generateSecurePassword();
      expect(password).toHaveLength(16);
    });

    it('should generate password with specified length', () => {
      const password = generateSecurePassword(20);
      expect(password).toHaveLength(20);
    });

    it('should throw error for passwords shorter than 12 characters', () => {
      expect(() => generateSecurePassword(8)).toThrow('Password length must be at least 12 characters for security');
    });

    it('should generate password with all character types', () => {
      const password = generateSecurePassword(16);
      
      // Check for lowercase
      expect(/[a-z]/.test(password)).toBe(true);
      
      // Check for uppercase
      expect(/[A-Z]/.test(password)).toBe(true);
      
      // Check for numbers
      expect(/\d/.test(password)).toBe(true);
      
      // Check for special characters
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should generate passwords that pass strength validation', () => {
      const password = generateSecurePassword();
      const validation = validatePasswordStrength(password);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const password = 'StrongP@ssw0rd123';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const password = 'Short1!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without lowercase letters', () => {
      const password = 'PASSWORD123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letters', () => {
      const password = 'password123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'Password!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'Password123';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for weak password', () => {
      const password = 'weak';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4); // Length, uppercase, numbers, special chars
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('validateEnvironmentConfig', () => {
    it('should pass validation with all required variables set correctly', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';
      process.env.JWT_EXPIRES_IN = '1h';
      process.env.BCRYPT_ROUNDS = '12';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '5';

      const result = await validateEnvironmentConfig();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Environment configuration is valid');
    });

    it('should fail validation when required variables are missing', async () => {
      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Environment configuration validation failed:');
    });

    it('should fail validation when JWT_SECRET is too short', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'short';

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - JWT_SECRET must be at least 32 characters long');
    });

    it('should fail validation when JWT_SECRET is default value', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'your-super-secret-jwt-key-here-change-in-production';

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - JWT_SECRET must be changed from default value');
    });

    it('should fail validation when CSRF_SECRET is default value', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';
      process.env.CSRF_SECRET = 'your-csrf-secret-here-change-in-production';

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - CSRF_SECRET must be changed from default value');
    });

    it('should fail validation when BCRYPT_ROUNDS is out of range', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';
      process.env.BCRYPT_ROUNDS = '5'; // Too low

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - BCRYPT_ROUNDS should be between 10 and 15 for optimal security/performance balance');
    });

    it('should fail validation when RATE_LIMIT_MAX_ATTEMPTS is out of range', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '25'; // Too high

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - RATE_LIMIT_MAX_ATTEMPTS should be between 3 and 20');
    });

    it('should fail validation when JWT_EXPIRES_IN has invalid format', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';
      process.env.JWT_EXPIRES_IN = 'invalid-format';

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - JWT_EXPIRES_IN must be in format like "1h", "30m", "7d"');
    });

    it('should accept valid JWT_EXPIRES_IN formats', async () => {
      const validFormats = ['1h', '30m', '7d', '60s'];
      
      for (const format of validFormats) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
        process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';
        process.env.JWT_EXPIRES_IN = format;

        const result = await validateEnvironmentConfig();
        expect(result).toBe(true);
      }
    });

    it('should fail validation when Supabase URL appears invalid', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://invalid-url';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough-for-production';

      const result = await validateEnvironmentConfig();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('  - NEXT_PUBLIC_SUPABASE_URL appears to be invalid');
    });
  });
});