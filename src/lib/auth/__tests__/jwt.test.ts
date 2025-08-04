/**
 * Unit tests for JWT token management utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateJWTToken, verifyJWTToken, validateJWTToken } from '../jwt';
import { User } from '@/types/auth';

// Mock user for testing
const mockUser: User = {
  id: 'test-user-id-123',
  username: 'testuser',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z'
};

// Mock environment variables
const originalEnv = process.env;

describe('JWT Token Management', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key-for-jwt-testing-purposes-must-be-long-enough',
      JWT_EXPIRES_IN: '1h'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateJWTToken', () => {
    it('should generate a valid JWT token for a user', async () => {
      const token = await generateJWTToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should throw error when JWT_SECRET is not configured', async () => {
      delete process.env.JWT_SECRET;

      await expect(generateJWTToken(mockUser)).rejects.toThrow(
        'JWT_SECRET environment variable is required'
      );
    });
  });

  describe('verifyJWTToken', () => {
    it('should verify and decode a valid token', async () => {
      const token = await generateJWTToken(mockUser);
      const payload = await verifyJWTToken(token);

      expect(payload.sub).toBe(mockUser.id);
      expect(payload.username).toBe(mockUser.username);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should throw error for malformed token', async () => {
      const malformedToken = 'invalid.token.format';

      await expect(verifyJWTToken(malformedToken)).rejects.toThrow('TOKEN_INVALID');
    });
  });

  describe('validateJWTToken', () => {
    it('should return valid result for valid token', async () => {
      const token = await generateJWTToken(mockUser);
      const result = await validateJWTToken(token);

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(mockUser.id);
      expect(result.user?.username).toBe(mockUser.username);
      expect(result.user?.role).toBe(mockUser.role);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result for malformed token', async () => {
      const result = await validateJWTToken('invalid.token');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('TOKEN_INVALID');
    });
  });
});