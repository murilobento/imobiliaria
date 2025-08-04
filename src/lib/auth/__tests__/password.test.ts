/**
 * Unit tests for password utilities
 * Tests password hashing, verification, validation, and security features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecurePassword,
  needsRehash
} from '../password';

describe('Password Utilities', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.BCRYPT_ROUNDS;
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should use configurable salt rounds from environment', async () => {
      process.env.BCRYPT_ROUNDS = '10';
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      // bcrypt hash format: $2a$rounds$salt+hash
      const rounds = hash.split('$')[2];
      expect(rounds).toBe('10');
    });

    it('should use default salt rounds for invalid environment values', async () => {
      process.env.BCRYPT_ROUNDS = '5'; // Too low
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const rounds = hash.split('$')[2];
      expect(rounds).toBe('12'); // Default
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      await expect(hashPassword(null as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(undefined as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(123 as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for password too short', async () => {
      const shortPassword = '1234567'; // 7 chars, minimum is 8
      await expect(hashPassword(shortPassword)).rejects.toThrow('Password must be between 8 and 128 characters');
    });

    it('should throw error for password too long', async () => {
      const longPassword = 'a'.repeat(129); // 129 chars, maximum is 128
      await expect(hashPassword(longPassword)).rejects.toThrow('Password must be between 8 and 128 characters');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle timing attacks by using bcrypt.compare', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      // Multiple verification attempts should not reveal timing information
      const startTime = Date.now();
      await verifyPassword('wrong1', hash);
      const time1 = Date.now() - startTime;
      
      const startTime2 = Date.now();
      await verifyPassword('wrong2', hash);
      const time2 = Date.now() - startTime2;
      
      // Times should be relatively similar (within reasonable bounds)
      // This is a basic check - bcrypt.compare handles the actual timing protection
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('TestPassword123!');
      const isValid = await verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should return false for non-string password', async () => {
      const hash = await hashPassword('TestPassword123!');
      
      expect(await verifyPassword(null as any, hash)).toBe(false);
      expect(await verifyPassword(undefined as any, hash)).toBe(false);
      expect(await verifyPassword(123 as any, hash)).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('TestPassword123!', '');
      expect(isValid).toBe(false);
    });

    it('should return false for non-string hash', async () => {
      expect(await verifyPassword('TestPassword123!', null as any)).toBe(false);
      expect(await verifyPassword('TestPassword123!', undefined as any)).toBe(false);
      expect(await verifyPassword('TestPassword123!', 123 as any)).toBe(false);
    });

    it('should handle bcrypt errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Invalid hash format should not throw but return false
      const isValid = await verifyPassword('TestPassword123!', 'invalid-hash');
      
      expect(isValid).toBe(false);
      // Note: bcrypt might handle invalid hashes without throwing, so we don't assert console.error was called
      
      consoleSpy.mockRestore();
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without lowercase', () => {
      const password = 'STRONGPASS123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const password = 'strongpass123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'StrongPass!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'StrongPass123';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password too short', () => {
      const password = 'Short1!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password too long', () => {
      const password = 'A'.repeat(129) + '1!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should reject common password patterns', () => {
      const commonPasswords = [
        'password123!',
        'Password123!',
        '123456789!Aa',
        'admin123!A',
        'qwerty123!A',
        'letmein123!A'
      ];
      
      commonPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password contains common patterns and is not secure');
      });
    });

    it('should reject passwords with repeated characters', () => {
      const password = 'Passsword123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password should not contain repeated characters');
    });

    it('should handle empty password', () => {
      const result = validatePasswordStrength('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should handle non-string password', () => {
      const result = validatePasswordStrength(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should accumulate multiple errors', () => {
      const weakPassword = 'weak';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = generateSecurePassword();
      
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBe(16);
    });

    it('should generate password with custom length', () => {
      const customLength = 20;
      const password = generateSecurePassword(customLength);
      
      expect(password.length).toBe(customLength);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should generate password that passes strength validation', () => {
      const password = generateSecurePassword();
      const validation = validatePasswordStrength(password);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should contain all required character types', () => {
      const password = generateSecurePassword();
      
      expect(/[a-z]/.test(password)).toBe(true); // lowercase
      expect(/[A-Z]/.test(password)).toBe(true); // uppercase
      expect(/\d/.test(password)).toBe(true); // numbers
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true); // special chars
    });
  });

  describe('needsRehash', () => {
    it('should return false for hash with current salt rounds', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const needs = needsRehash(hash);
      
      expect(needs).toBe(false);
    });

    it('should return true when salt rounds change', async () => {
      // Create hash with current settings
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      // Change salt rounds
      process.env.BCRYPT_ROUNDS = '10';
      const needs = needsRehash(hash);
      
      expect(needs).toBe(true);
    });

    it('should return true for invalid hash format', () => {
      const needs = needsRehash('invalid-hash-format');
      expect(needs).toBe(true);
    });

    it('should handle empty hash', () => {
      const needs = needsRehash('');
      expect(needs).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should complete full password lifecycle', async () => {
      const originalPassword = 'TestPassword123!';
      
      // 1. Validate password strength
      const validation = validatePasswordStrength(originalPassword);
      expect(validation.isValid).toBe(true);
      
      // 2. Hash the password
      const hash = await hashPassword(originalPassword);
      expect(hash).toBeDefined();
      
      // 3. Verify correct password
      const isValidCorrect = await verifyPassword(originalPassword, hash);
      expect(isValidCorrect).toBe(true);
      
      // 4. Verify incorrect password
      const isValidIncorrect = await verifyPassword('WrongPassword123!', hash);
      expect(isValidIncorrect).toBe(false);
      
      // 5. Check if rehash is needed
      const needsUpdate = needsRehash(hash);
      expect(needsUpdate).toBe(false);
    });

    it('should handle password update scenario', async () => {
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';
      
      // Hash old password
      const oldHash = await hashPassword(oldPassword);
      
      // Verify old password works
      expect(await verifyPassword(oldPassword, oldHash)).toBe(true);
      
      // Hash new password
      const newHash = await hashPassword(newPassword);
      
      // Verify old password doesn't work with new hash
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);
      
      // Verify new password works with new hash
      expect(await verifyPassword(newPassword, newHash)).toBe(true);
    });
  });
});