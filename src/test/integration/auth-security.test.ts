/**
 * Authentication Security Tests
 * Tests rate limiting effectiveness, CSRF protection, JWT token manipulation attempts,
 * and SQL injection/XSS prevention
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as verifyGet, POST as verifyPost } from '@/app/api/auth/verify/route';
import { middleware } from '../../../middleware';

// Mock dependencies
vi.mock('@/lib/auth/database', () => ({
  verifyUserPassword: vi.fn(),
  updateLastLogin: vi.fn(),
  findUserByUsername: vi.fn(),
}));

vi.mock('@/lib/auth/jwt', () => ({
  generateJWTToken: vi.fn(),
  verifyJWTToken: vi.fn(),
  validateJWTToken: vi.fn(),
  extractUserIdFromToken: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimit', () => ({
  getClientIp: vi.fn(() => '192.168.1.100'),
  createRateLimiter: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimitMiddleware', () => ({
  rateLimitMiddleware: vi.fn(),
  handleFailedAuth: vi.fn(),
  handleSuccessfulAuth: vi.fn(),
}));

vi.mock('@/lib/auth/securityLogger', () => ({
  logSecurityEvent: vi.fn(),
}));

// Test data
const mockUser = {
  id: 'user-123',
  username: 'admin',
  password_hash: '$2b$12$hashedpassword',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z',
};

const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2NDA5OTUyMDAsImV4cCI6MTY0MDk5ODgwMH0.test-signature';

describe('Authentication Security Tests', () => {
  beforeAll(() => {
    // Setup environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-security-tests';
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Rate Limiting Effectiveness', () => {
    it('should enforce IP-based rate limiting under load', async () => {
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      const { verifyUserPassword } = await import('@/lib/auth/database');

      // Mock failed authentication
      vi.mocked(verifyUserPassword).mockResolvedValue(null);

      // Mock rate limiting - first few attempts succeed, then get rate limited
      vi.mocked(rateLimitMiddleware)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({
          success: false,
          response: new NextResponse(
            JSON.stringify({ success: false, error: 'Too many attempts' }),
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit-IP': '5',
                'X-RateLimit-Remaining-IP': '0',
                'X-RateLimit-Reset-IP': String(Date.now() + 900000),
              }
            }
          )
        });

      const clientIp = '192.168.1.100';
      const loginData = { username: 'admin', password: 'wrongpassword' };

      // Simulate multiple failed login attempts from same IP
      const requests = Array.from({ length: 6 }, (_, i) => 
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': clientIp,
          },
          body: JSON.stringify(loginData),
        })
      );

      const responses = [];
      for (const request of requests) {
        const response = await loginPost(request);
        responses.push(response);
      }

      // First 5 attempts should be processed (even if they fail authentication)
      expect(responses.slice(0, 5)).toHaveLength(5);
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(401); // Authentication failed
      });

      // 6th attempt should be rate limited
      expect(responses[5].status).toBe(429);
      const rateLimitedBody = await responses[5].json();
      expect(rateLimitedBody.error).toContain('Too many attempts');
    });

    it('should enforce account-based rate limiting with progressive delays', async () => {
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      const { verifyUserPassword } = await import('@/lib/auth/database');

      // Mock failed authentication
      vi.mocked(verifyUserPassword).mockResolvedValue(null);

      // Mock progressive rate limiting for specific account
      vi.mocked(rateLimitMiddleware)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({
          success: false,
          response: new NextResponse(
            JSON.stringify({ success: false, error: 'Account temporarily locked' }),
            { 
              status: 423,
              headers: {
                'X-RateLimit-Limit-Account': '3',
                'X-RateLimit-Remaining-Account': '0',
                'X-RateLimit-Reset-Account': String(Date.now() + 1800000), // 30 minutes
              }
            }
          )
        });

      const username = 'admin';
      const loginData = { username, password: 'wrongpassword' };

      // Simulate multiple failed attempts for same account from different IPs
      const ips = ['192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103'];
      const responses = [];

      for (let i = 0; i < 4; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ips[i],
          },
          body: JSON.stringify(loginData),
        });

        const response = await loginPost(request);
        responses.push(response);
      }

      // First 3 attempts should be processed
      expect(responses.slice(0, 3)).toHaveLength(3);
      responses.slice(0, 3).forEach(response => {
        expect(response.status).toBe(401); // Authentication failed
      });

      // 4th attempt should be account locked
      expect(responses[3].status).toBe(423);
      const lockedBody = await responses[3].json();
      expect(lockedBody.error).toContain('Account temporarily locked');
    });

    it('should handle concurrent rate limiting requests correctly', async () => {
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      const { verifyUserPassword } = await import('@/lib/auth/database');

      // Mock failed authentication
      vi.mocked(verifyUserPassword).mockResolvedValue(null);

      // Mock rate limiting that allows first few, then blocks
      let callCount = 0;
      vi.mocked(rateLimitMiddleware).mockImplementation(async () => {
        callCount++;
        if (callCount <= 3) {
          return { success: true };
        }
        return {
          success: false,
          response: new NextResponse(
            JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
            { status: 429 }
          )
        };
      });

      const loginData = { username: 'admin', password: 'wrongpassword' };
      const clientIp = '192.168.1.100';

      // Create 10 concurrent requests
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': clientIp,
          },
          body: JSON.stringify(loginData),
        })
      );

      // Execute all requests concurrently
      const responses = await Promise.all(
        requests.map(request => loginPost(request))
      );

      // Check that rate limiting was applied
      const successfulResponses = responses.filter(r => r.status === 401);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length).toBeLessThanOrEqual(3);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(successfulResponses.length + rateLimitedResponses.length).toBe(10);
    });
  });

  describe('CSRF Protection Mechanisms', () => {
    it('should validate CSRF tokens for state-changing requests', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');

      // Mock valid JWT token
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: {
          id: 'user-123',
          username: 'admin',
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-01T12:00:00Z',
        }
      });

      // Test POST request without CSRF token
      const requestWithoutCSRF = new NextRequest('http://localhost:3000/admin/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token',
        },
        body: JSON.stringify({ action: 'update' }),
      });

      const responseWithoutCSRF = await middleware(requestWithoutCSRF);
      expect(responseWithoutCSRF.status).toBe(403);

      // Test POST request with valid CSRF token
      const requestWithCSRF = new NextRequest('http://localhost:3000/admin/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token; csrf-token=valid-csrf-token',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({ action: 'update' }),
      });

      const responseWithCSRF = await middleware(requestWithCSRF);
      expect(responseWithCSRF.status).toBe(200);
    });

    it('should allow GET requests without CSRF validation', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');

      // Mock valid JWT token
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: {
          id: 'user-123',
          username: 'admin',
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-01T12:00:00Z',
        }
      });

      // Test GET request without CSRF token (should be allowed)
      const getRequest = new NextRequest('http://localhost:3000/admin/dashboard', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=valid-token',
        },
      });

      const getResponse = await middleware(getRequest);
      expect(getResponse.status).toBe(200);
    });

    it('should skip CSRF validation for API routes', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');

      // Mock valid JWT token
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: {
          id: 'user-123',
          username: 'admin',
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-01T12:00:00Z',
        }
      });

      // Test API route POST request without CSRF token (should be allowed)
      const apiRequest = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token',
        },
        body: JSON.stringify({ name: 'New User' }),
      });

      const apiResponse = await middleware(apiRequest);
      expect(apiResponse.status).toBe(200);
    });
  });

  describe('JWT Token Manipulation Attempts', () => {
    it('should reject tampered JWT tokens', async () => {
      const { verifyJWTToken } = await import('@/lib/auth/jwt');

      // Mock JWT verification to reject tampered tokens
      vi.mocked(verifyJWTToken).mockRejectedValue(new Error('JWT_INVALID_SIGNATURE'));

      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2NDA5OTUyMDAsImV4cCI6MTY0MDk5ODgwMH0.tampered-signature';

      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${tamperedToken}`,
        },
      });

      const response = await verifyGet(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid authentication token');
    });

    it('should reject expired JWT tokens', async () => {
      const { verifyJWTToken } = await import('@/lib/auth/jwt');

      // Mock JWT verification to reject expired tokens
      vi.mocked(verifyJWTToken).mockRejectedValue(new Error('TOKEN_EXPIRED'));

      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2NDA5OTUyMDAsImV4cCI6MTY0MDk5NTIwMX0.expired-signature';

      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${expiredToken}`,
        },
      });

      const response = await verifyGet(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Token has expired');
    });

    it('should reject JWT tokens with invalid payload structure', async () => {
      const { verifyJWTToken } = await import('@/lib/auth/jwt');

      // Mock JWT verification to reject malformed payload
      vi.mocked(verifyJWTToken).mockRejectedValue(new Error('JWT_MALFORMED_PAYLOAD'));

      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.signature';

      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: malformedToken }),
      });

      const response = await verifyPost(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid authentication token');
    });

    it('should reject JWT tokens with privilege escalation attempts', async () => {
      const { verifyJWTToken } = await import('@/lib/auth/jwt');
      const { findUserByUsername } = await import('@/lib/auth/database');

      // Mock JWT verification to return token with escalated privileges
      vi.mocked(verifyJWTToken).mockResolvedValue({
        sub: 'user-123',
        username: 'admin',
        role: 'superadmin', // Escalated role
        iat: 1640995200,
        exp: 1640998800,
      });

      // Mock database to return user with normal privileges
      vi.mocked(findUserByUsername).mockResolvedValue({
        id: 'user-123',
        username: 'admin',
        password_hash: '$2b$12$hashedpassword',
        role: 'admin', // Normal role
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-01T12:00:00Z',
      });

      const escalatedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ.escalated-signature';

      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${escalatedToken}`,
        },
      });

      const response = await verifyGet(request);
      
      // Should still work but return the correct role from database
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.user.role).toBe('admin'); // Should use database role, not token role
    });
  });

  describe('SQL Injection and XSS Prevention', () => {
    it('should sanitize login input to prevent SQL injection', async () => {
      const { verifyUserPassword } = await import('@/lib/auth/database');
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');

      // Mock rate limiting to pass
      vi.mocked(rateLimitMiddleware).mockResolvedValue({ success: true });

      // Mock database function to verify it receives sanitized input
      vi.mocked(verifyUserPassword).mockResolvedValue(null);

      const sqlInjectionAttempts = [
        "admin'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "admin' UNION SELECT * FROM users --",
        "admin'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
      ];

      for (const maliciousUsername of sqlInjectionAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: maliciousUsername,
            password: 'password123',
          }),
        });

        const response = await loginPost(request);
        
        // Should handle gracefully without crashing (400 for invalid input, 401 for auth failure)
        expect([400, 401]).toContain(response.status);
        
        // Verify the database function was called (input sanitization happens at validation level)
        expect(verifyUserPassword).toHaveBeenCalledWith(
          expect.stringContaining('admin'), // Should contain the username part
          'password123'
        );
      }
    });

    it('should prevent XSS in error messages', async () => {
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');

      // Mock rate limiting to pass
      vi.mocked(rateLimitMiddleware).mockResolvedValue({ success: true });

      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
      ];

      for (const xssPayload of xssAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: xssPayload,
            password: 'password123',
          }),
        });

        const response = await loginPost(request);
        const body = await response.json();
        
        // Error message should not contain the XSS payload
        expect(body.error).not.toContain('<script>');
        expect(body.error).not.toContain('javascript:');
        expect(body.error).not.toContain('onerror');
        
        // Should be a generic error message
        expect(body.error).toMatch(/^[a-zA-Z\s]+$/);
      }
    });

    it('should validate input length to prevent buffer overflow attacks', async () => {
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');

      // Mock rate limiting to pass
      vi.mocked(rateLimitMiddleware).mockResolvedValue({ success: true });

      // Test extremely long username
      const longUsername = 'a'.repeat(1000);
      const longPassword = 'b'.repeat(1000);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: longUsername,
          password: longPassword,
        }),
      });

      const response = await loginPost(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('too long');
    });

    it('should prevent header injection attacks', async () => {
      const { rateLimitMiddleware } = await import('@/lib/auth/rateLimitMiddleware');
      const { verifyUserPassword } = await import('@/lib/auth/database');
      const { generateJWTToken } = await import('@/lib/auth/jwt');

      // Mock successful authentication
      vi.mocked(rateLimitMiddleware).mockResolvedValue({ success: true });
      vi.mocked(verifyUserPassword).mockResolvedValue(mockUser);
      vi.mocked(generateJWTToken).mockResolvedValue(mockJwtToken);

      const headerInjectionAttempts = [
        'admin\r\nSet-Cookie: malicious=value',
        'admin\nLocation: http://evil.com',
        'admin\r\nContent-Type: text/html',
      ];

      for (const maliciousUsername of headerInjectionAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: maliciousUsername,
            password: 'password123',
          }),
        });

        const response = await loginPost(request);
        
        // Should not contain injected headers
        const setCookieHeader = response.headers.get('Set-Cookie');
        expect(setCookieHeader).not.toContain('malicious=value');
        
        const locationHeader = response.headers.get('Location');
        if (locationHeader) {
          expect(locationHeader).not.toContain('evil.com');
        }
        
        const contentTypeHeader = response.headers.get('Content-Type');
        expect(contentTypeHeader).toContain('application/json');
      }
    });
  });

  describe('Security Headers and Configuration', () => {
    it('should set appropriate security headers in middleware', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');

      // Mock valid JWT token
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: {
          id: 'user-123',
          username: 'admin',
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-01T12:00:00Z',
        }
      });

      const request = new NextRequest('http://localhost:3000/admin/dashboard', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=valid-token',
        },
      });

      const response = await middleware(request);

      // Check security headers
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('should set HTTPS security headers in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { validateJWTToken } = await import('@/lib/auth/jwt');

      // Mock valid JWT token
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: {
          id: 'user-123',
          username: 'admin',
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-01T12:00:00Z',
        }
      });

      const request = new NextRequest('https://localhost:3000/admin/dashboard', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=valid-token',
        },
      });

      const response = await middleware(request);

      // Check HTTPS security headers
      expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});