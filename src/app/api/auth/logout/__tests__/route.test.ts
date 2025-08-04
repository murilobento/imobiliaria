/**
 * Unit tests for logout API endpoint
 * Tests token invalidation, cookie clearing, security logging, and error handling
 */

import { NextRequest } from 'next/server';
import { POST, GET, PUT, DELETE, PATCH } from '../route';
import { verifyJWTToken, extractUserIdFromToken } from '@/lib/auth/jwt';
import { deleteAuthSession } from '@/lib/auth/database';
import { getClientIp } from '@/lib/auth/rateLimit';

// Mock dependencies
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/database');
vi.mock('@/lib/auth/rateLimit');

const mockVerifyJWTToken = vi.mocked(verifyJWTToken);
const mockExtractUserIdFromToken = vi.mocked(extractUserIdFromToken);
const mockDeleteAuthSession = vi.mocked(deleteAuthSession);
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

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

// Helper function to create mock request
function createMockRequest(options: {
  method?: string;
  cookieToken?: string;
  authHeader?: string;
  headers?: Record<string, string>;
} = {}): NextRequest {
  const {
    method = 'POST',
    cookieToken,
    authHeader,
    headers = {}
  } = options;

  // Only add default user-agent if no headers are provided or if user-agent is not explicitly set
  const requestHeaders: Record<string, string> = {};
  
  if (Object.keys(headers).length === 0 || !('user-agent' in headers)) {
    requestHeaders['user-agent'] = 'test-agent';
  }
  
  // Add provided headers (this will override defaults if provided)
  Object.assign(requestHeaders, headers);

  if (authHeader) {
    requestHeaders['authorization'] = authHeader;
  }

  const request = new NextRequest('http://localhost:3000/api/auth/logout', {
    method,
    headers: requestHeaders
  });

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

describe('/api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockDeleteAuthSession.mockResolvedValue();
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('POST /api/auth/logout', () => {
    describe('Successful logout', () => {
      it('should logout user with valid token from cookie', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        expect(mockVerifyJWTToken).toHaveBeenCalledWith(mockToken);
      });

      it('should logout user with valid token from Authorization header', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          authHeader: `Bearer ${mockToken}`
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        expect(mockVerifyJWTToken).toHaveBeenCalledWith(mockToken);
      });

      it('should log successful logout event', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"logout"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"user_id":"user-123"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"user_initiated"')
        );
      });

      it('should clear both auth-token and refresh-token cookies', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await POST(request);

        // Assert
        const setCookieHeader = response.headers.get('Set-Cookie');
        expect(setCookieHeader).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        expect(setCookieHeader).toContain('refresh-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      });

      it('should set security headers', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await POST(request);

        // Assert
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      });
    });

    describe('Logout without token', () => {
      it('should succeed when no token is provided', async () => {
        // Arrange
        const request = createMockRequest();

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        expect(mockVerifyJWTToken).not.toHaveBeenCalled();
      });

      it('should log logout attempt without token', async () => {
        // Arrange
        const request = createMockRequest();

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"logout"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"no_token_provided"')
        );
      });
    });

    describe('Logout with invalid token', () => {
      it('should succeed even with invalid token', async () => {
        // Arrange
        mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));
        mockExtractUserIdFromToken.mockReturnValue('user-123');
        
        const request = createMockRequest({
          cookieToken: 'invalid-token'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      });

      it('should log logout attempt with invalid token', async () => {
        // Arrange
        mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));
        mockExtractUserIdFromToken.mockReturnValue('user-123');
        
        const request = createMockRequest({
          cookieToken: 'invalid-token'
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"type":"logout"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"invalid_token"')
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"user_id":"user-123"')
        );
      });

      it('should handle case where user ID cannot be extracted', async () => {
        // Arrange
        mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));
        mockExtractUserIdFromToken.mockReturnValue(null);
        
        const request = createMockRequest({
          cookieToken: 'invalid-token'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"invalid_token"')
        );
      });
    });

    describe('Token extraction', () => {
      it('should prioritize cookie token over Authorization header', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          cookieToken: mockToken,
          authHeader: 'Bearer different-token'
        });

        // Act
        await POST(request);

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
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockVerifyJWTToken).not.toHaveBeenCalled();
      });

      it('should handle Authorization header without Bearer prefix', async () => {
        // Arrange
        const request = createMockRequest({
          authHeader: mockToken
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
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
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
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
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"reason":"invalid_token"')
        );
      });

      it('should still clear cookies even on error', async () => {
        // Arrange
        mockVerifyJWTToken.mockImplementation(() => {
          throw new Error('Unexpected error');
        });
        
        const request = createMockRequest({
          cookieToken: mockToken
        });

        // Act
        const response = await POST(request);

        // Assert
        expect(response.headers.get('Set-Cookie')).toContain('auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      });
    });

    describe('Client IP and User Agent handling', () => {
      it('should handle missing user agent', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        // Create request without user-agent header
        const request = new NextRequest('http://localhost:3000/api/auth/logout', {
          method: 'POST',
          headers: {} // Explicitly no headers
        });

        // Mock cookies
        vi.spyOn(request.cookies, 'get').mockImplementation((name) => {
          if (name === 'auth-token') {
            return { name: 'auth-token', value: mockToken };
          }
          return undefined;
        });

        // Act
        const response = await POST(request);

        // Assert
        expect(response.status).toBe(200);
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"user_agent":"Unknown"')
        );
      });

      it('should use custom user agent when provided', async () => {
        // Arrange
        mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
        
        const request = createMockRequest({
          cookieToken: mockToken,
          headers: { 'user-agent': 'Custom Browser/1.0' }
        });

        // Act
        await POST(request);

        // Assert
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[SECURITY]',
          expect.stringContaining('"user_agent":"Custom Browser/1.0"')
        );
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