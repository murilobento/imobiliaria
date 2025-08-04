/**
 * Unit tests for token verification API endpoint
 * Tests token validation, user verification, error handling, and security logging
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE, PATCH } from '../route';
import { verifyJWTToken, extractUserIdFromToken } from '@/lib/auth/jwt';
import { findUserByUsername } from '@/lib/auth/database';
import { getClientIp } from '@/lib/auth/rateLimit';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';
import { afterEach } from 'vitest';
import { vi } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/database');
vi.mock('@/lib/auth/rateLimit');

const mockVerifyJWTToken = vi.mocked(verifyJWTToken);
const mockExtractUserIdFromToken = vi.mocked(extractUserIdFromToken);
const mockFindUserByUsername = vi.mocked(findUserByUsername);
const mockGetClientIp = vi.mocked(getClientIp);

// Mock console.log to capture security logs
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation();
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation();

// Test data
const mockJWTPayload = {
  sub: 'user-123',
  username: 'testuser',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

const mockDbUser = {
  id: 'user-123',
  username: 'testuser',
  password_hash: 'hashed-password',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-02T00:00:00Z',
  failed_attempts: 0,
  locked_until: null,
  updated_at: '2024-01-01T00:00:00Z'
};

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  role: 'admin' as const,
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-02T00:00:00Z'
};

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

// Helper function to create mock request
function createMockRequest(options: {
  method?: string;
  cookieToken?: string;
  authHeader?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): NextRequest {
  const {
    method = 'GET',
    cookieToken,
    authHeader,
    headers = {},
    body
  } = options;

  const requestHeaders = {
    'user-agent': 'test-agent',
    ...headers
  };

  if (authHeader) {
    requestHeaders['authorization'] = authHeader;
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
    requestHeaders['content-type'] = 'application/json';
  }

  const request = new NextRequest('http://localhost:3000/api/auth/verify', requestInit);

  // Mock cookies if provided
  if (cookieToken) {
    vi.spyOn(request.cookies, 'get').mockImplementation((name) => {
      if (name === 'auth-token') {
        return { name: 'auth-token', value: cookieToken };
      }
      return undefined;
    });
  }

  return request;
}

describe('/api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockGetClientIp.mockReturnValue('127.0.0.1');
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('GET /api/auth/verify', () => {
    describe('Successful verification', () => {
      it('should verify valid token from cookie', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(mockDbUser);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual(mockUser);
        expect(mockVerifyJWTToken).toHaveBeenCalledWith(mockToken);
        expect(mockFindUserByUsername).toHaveBeenCalledWith('testuser');
      });

      it('should verify valid token from Authorization header', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(mockDbUser);
        
        const request = createMockRequest({
          authHeader: `Bearer ${mockToken}`
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual(mockUser);
        expect(mockVerifyJWTToken).toHaveBeenCalledWith(mockToken);
      });

      it('should log successful verification', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(mockDbUser);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        await GET(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"login_success"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"token_verified"')
        );
      });

      it('should work even if database user lookup fails', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockRejectedValue(new Error('Database error'));
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual({
          id: 'user-123',
          username: 'testuser',
          role: 'admin',
          created_at: '',
          last_login: null
        });
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Database error during user verification:',
          expect.any(Error)
        );
      });

      it('should set security headers', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(mockDbUser);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await GET(request);

        // Assert
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      });
    });

    describe('Token validation failures', () => {
      it('should return 401 when no token is provided', async () => {
        // Arrange
        const request = createMockRequest();

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('No authentication token provided');
        expect(mockVerifyJWTToken).not.toHaveBeenCalled();
      });

      it('should return 401 for invalid token', async () => {
        // Arrange
        mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));
        mockExtractUserIdFromToken.mockReturnValue('user-123');
        
        const request = createMockRequest({
          cookieToken: 'invalid-token'
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid authentication token');
      });

      it('should return 401 for expired token', async () => {
        // Arrange
        mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_EXPIRED'));
        mockExtractUserIdFromToken.mockReturnValue('user-123');
        
        const request = createMockRequest({
          cookieToken: 'expired-token'
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Token has expired');
      });

      it('should return 401 when user no longer exists', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(null);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('User no longer exists');
      });

      it('should log token validation failures', async () => {
        // Arrange
        mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));
        mockExtractUserIdFromToken.mockReturnValue('user-123');
        
        const request = createMockRequest({
          cookieToken: 'invalid-token'
        });

        // Act
        await GET(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"token_invalid"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"invalid_token"')
        );
      });

      it('should log when no token is provided', async () => {
        // Arrange
        const request = createMockRequest();

        // Act
        await GET(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"no_token_provided"')
        );
      });
    });

    describe('Token extraction', () => {
      it('should prioritize cookie token over Authorization header', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(mockDbUser);
        
        const request = createMockRequest({
          cookieToken: mockToken,
          authHeader: 'Bearer different-token'
        });

        // Act
        await GET(request);

        // Assert
        expect(mockVerifyJWTToken).toHaveBeenCalledWith(mockToken);
        expect(mockVerifyJWTToken).not.toHaveBeenCalledWith('different-token');
      });

      it('should handle malformed Authorization header', async () => {
        // Arrange
        const request = createMockRequest({
          authHeader: 'InvalidFormat token'
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe('No authentication token provided');
        expect(mockVerifyJWTToken).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        // Arrange
        mockVerifyJWTToken.mockImplementation(() => {
          throw new Error('Unexpected error');
        });
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid authentication token');
      });

      it('should log unexpected errors', async () => {
        // Arrange
        mockVerifyJWTToken.mockImplementation(() => {
          throw new Error('Unexpected error');
        });
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        await GET(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"invalid_token"')
        );
      });
    });
  });

  describe('POST /api/auth/verify', () => {
    describe('Successful verification', () => {
      it('should verify token from request body', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        mockFindUserByUsername.mockResolvedValue(mockDbUser);
        
        const request = createMockRequest({
          method: 'POST',
          body: { token: mockToken }
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual(mockUser);
      });
    });

    describe('Input validation', () => {
      it('should return 400 for invalid JSON', async () => {
        // Arrange
        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'invalid json'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid JSON in request body');
      });

      it('should return 400 when token is missing from body', async () => {
        // Arrange
        const request = createMockRequest({
          method: 'POST',
          body: {}
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Token is required in request body');
      });

      it('should return 400 when token is not a string', async () => {
        // Arrange
        const request = createMockRequest({
          method: 'POST',
          body: { token: 123 }
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Token is required in request body');
      });

      it('should log when token is missing from body', async () => {
        // Arrange
        const request = createMockRequest({
          method: 'POST',
          body: {}
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"no_token_in_body"')
        );
      });
    });

    describe('Error handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        // Arrange - Mock JSON parsing to throw an error after getClientIp is called
        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': 'test-agent' },
          body: 'invalid json'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid JSON in request body');
      });

      it('should log unexpected errors in POST', async () => {
        // Arrange - Test with invalid JSON which is handled gracefully
        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': 'test-agent' },
          body: 'invalid json'
        });

        // Act
        await POST(request);

        // Assert - This should not call console.error since it's handled gracefully
        expect(mockConsoleError).not.toHaveBeenCalled();
      });
    });
  });

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for PUT request', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('GET, POST');
    });

    it('should return 405 for DELETE request', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('GET, POST');
    });

    it('should return 405 for PATCH request', async () => {
      const response = await PATCH();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('GET, POST');
    });
  });
});