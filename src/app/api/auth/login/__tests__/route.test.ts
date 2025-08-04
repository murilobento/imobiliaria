/**
 * Unit tests for login API endpoint
 * Tests credential validation, rate limiting, security logging, and error handling
 */

import { NextRequest } from 'next/server';
import { POST, GET, PUT, DELETE, PATCH } from '../route';
import { verifyUserPassword, updateLastLogin } from '@/lib/auth/database';
import { generateJWTToken } from '@/lib/auth/jwt';
import { rateLimitMiddleware, handleFailedAuth, handleSuccessfulAuth } from '@/lib/auth/rateLimitMiddleware';
import { getClientIp } from '@/lib/auth/rateLimit';

// Mock dependencies
vi.mock('@/lib/auth/database');
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/rateLimitMiddleware');
vi.mock('@/lib/auth/rateLimit');

const mockVerifyUserPassword = vi.mocked(verifyUserPassword);
const mockUpdateLastLogin = vi.mocked(updateLastLogin);
const mockGenerateJWTToken = vi.mocked(generateJWTToken);
const mockRateLimitMiddleware = vi.mocked(rateLimitMiddleware);
const mockHandleFailedAuth = vi.mocked(handleFailedAuth);
const mockHandleSuccessfulAuth = vi.mocked(handleSuccessfulAuth);
const mockGetClientIp = vi.mocked(getClientIp);

// Mock console.log to capture security logs
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation();
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation();

// Test data
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  password_hash: 'hashed-password',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: null,
  failed_attempts: 0,
  locked_until: null,
  updated_at: '2024-01-01T00:00:00Z'
};

const mockUserResponse = {
  id: 'user-123',
  username: 'testuser',
  role: 'admin' as const,
  created_at: '2024-01-01T00:00:00Z',
  last_login: null
};

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

// Helper function to create mock request
function createMockRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockRateLimitMiddleware.mockResolvedValue({
      success: true,
      ipLimit: { allowed: true, remainingAttempts: 5, type: 'ip' as const },
      accountLimit: { allowed: true, remainingAttempts: 3, type: 'account' as const }
    });
    mockUpdateLastLogin.mockResolvedValue();
    mockHandleFailedAuth.mockResolvedValue();
    mockHandleSuccessfulAuth.mockResolvedValue();
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('POST /api/auth/login', () => {
    describe('Successful login', () => {
      it('should authenticate user with valid credentials', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'validpassword'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual(expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role
        }));
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=');
        expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
        expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict');
      });

      it('should set secure cookie in production', async () => {
        // Arrange
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'validpassword'
        });

        try {
          // Act
          const response = await POST(request);

          // Assert
          expect(response.headers.get('Set-Cookie')).toContain('Secure');
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
      });

      it('should log successful login event', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'validpassword'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"login_success"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"user_id":"user-123"')
        );
      });

      it('should reset rate limits on successful login', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'validpassword'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith(request, 'testuser');
      });

      it('should update last login timestamp', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'validpassword'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockUpdateLastLogin).toHaveBeenCalledWith(mockUser.id);
      });
    });

    describe('Failed login attempts', () => {
      it('should return 401 for invalid credentials', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(null);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'wrongpassword'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid credentials');
        expect(mockHandleFailedAuth).toHaveBeenCalledWith(request, 'testuser');
      });

      it('should return 423 for locked account', async () => {
        // Arrange
        mockVerifyUserPassword.mockRejectedValue(new Error('Account is temporarily locked'));
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(423);
        expect(data.success).toBe(false);
        expect(data.error).toContain('temporarily locked');
      });

      it('should log failed login attempts', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(null);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'wrongpassword'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"login_failure"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"invalid_credentials"')
        );
      });
    });

    describe('Rate limiting', () => {
      it('should return 429 when rate limited', async () => {
        // Arrange
        const rateLimitResponse = new Response(
          JSON.stringify({
            success: false,
            error: 'RATE_LIMITED',
            message: 'Too many requests',
            retryAfter: 300
          }),
          { status: 429 }
        );

        mockRateLimitMiddleware.mockResolvedValue({
          success: false,
          response: rateLimitResponse as any,
          ipLimit: { allowed: false, remainingAttempts: 0, retryAfter: 300, type: 'ip' as const }
        });
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);

        // Assert
        expect(response.status).toBe(429);
        expect(mockVerifyUserPassword).not.toHaveBeenCalled();
      });

      it('should log rate limited attempts', async () => {
        // Arrange
        const rateLimitResponse = new Response(
          JSON.stringify({ success: false, error: 'RATE_LIMITED' }),
          { 
            status: 429,
            headers: { 'X-RateLimit-Limit-IP': '5' }
          }
        );

        mockRateLimitMiddleware.mockResolvedValue({
          success: false,
          response: rateLimitResponse as any,
          ipLimit: { allowed: false, remainingAttempts: 0, type: 'ip' as const }
        });
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"rate_limited"')
        );
      });
    });

    describe('Input validation', () => {
      it('should return 400 for missing username', async () => {
        // Arrange
        const request = createMockRequest({
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Username is required');
      });

      it('should return 400 for missing password', async () => {
        // Arrange
        const request = createMockRequest({
          username: 'testuser'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Password is required');
      });

      it('should return 400 for empty username', async () => {
        // Arrange
        const request = createMockRequest({
          username: '   ',
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Username is required');
      });

      it('should return 400 for username too long', async () => {
        // Arrange
        const longUsername = 'a'.repeat(51);
        const request = createMockRequest({
          username: longUsername,
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Username is too long');
      });

      it('should return 400 for password too long', async () => {
        // Arrange
        const longPassword = 'a'.repeat(129);
        const request = createMockRequest({
          username: 'testuser',
          password: longPassword
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Password is too long');
      });

      it('should return 400 for invalid JSON', async () => {
        // Arrange
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
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

      it('should sanitize username input', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: '  TestUser  ',
          password: 'password'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockVerifyUserPassword).toHaveBeenCalledWith('testuser', 'password');
      });
    });

    describe('Error handling', () => {
      it('should handle JWT generation failure', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockRejectedValue(new Error('JWT generation failed'));
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication failed');
      });

      it('should handle database errors gracefully', async () => {
        // Arrange
        mockVerifyUserPassword.mockRejectedValue(new Error('Database connection failed'));
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication failed');
      });

      it('should handle unexpected errors', async () => {
        // Arrange
        mockVerifyUserPassword.mockImplementation(() => {
          throw new Error('Unexpected error');
        });
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication failed');
      });

      it('should continue login even if last login update fails', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        mockUpdateLastLogin.mockRejectedValue(new Error('Update failed'));
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Failed to update last login:',
          expect.any(Error)
        );
      });
    });

    describe('Security headers', () => {
      it('should set security headers on successful response', async () => {
        // Arrange
        mockVerifyUserPassword.mockResolvedValue(mockUser);
        mockGenerateJWTToken.mockResolvedValue(mockToken);
        
        const request = createMockRequest({
          username: 'testuser',
          password: 'password'
        });

        // Act
        const response = await POST(request);

        // Assert
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      });
    });
  });

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for GET request', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('POST');
    });

    it('should return 405 for PUT request', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('POST');
    });

    it('should return 405 for DELETE request', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('POST');
    });

    it('should return 405 for PATCH request', async () => {
      const response = await PATCH();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
      expect(response.headers.get('Allow')).toBe('POST');
    });
  });
});