/**
 * Integration tests for production security features
 * Tests HTTPS enforcement, security headers, CSP, and secure cookies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../../../middleware';

// Mock the auth modules
vi.mock('@/lib/auth/jwt', () => ({
  validateJWTToken: vi.fn(),
  generateJWTToken: vi.fn()
}));

vi.mock('@/lib/auth/database', () => ({
  verifyUserPassword: vi.fn(),
  updateLastLogin: vi.fn()
}));

vi.mock('@/lib/auth/rateLimitMiddleware', () => ({
  rateLimitMiddleware: vi.fn(),
  handleFailedAuth: vi.fn(),
  handleSuccessfulAuth: vi.fn()
}));

vi.mock('@/lib/auth/rateLimit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1')
}));

vi.mock('@/lib/auth/securityLogger', () => ({
  logSecurityEvent: vi.fn()
}));

const originalEnv = process.env;

describe('Production Security Integration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('HTTPS Enforcement', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('http://example.com/admin');
      const response = await middleware(request);
      
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('https://example.com/admin');
    });

    it('should not redirect HTTPS requests in production', async () => {
      process.env.NODE_ENV = 'production';
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      const mockValidateJWTToken = validateJWTToken as any;
      mockValidateJWTToken.mockResolvedValue({ valid: false });
      
      const request = new NextRequest('https://example.com/admin');
      const response = await middleware(request);
      
      // Should redirect to login, not to HTTPS
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });

    it('should not redirect HTTP in development', async () => {
      process.env.NODE_ENV = 'development';
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      const mockValidateJWTToken = validateJWTToken as any;
      mockValidateJWTToken.mockResolvedValue({ valid: false });
      
      const request = new NextRequest('http://example.com/admin');
      const response = await middleware(request);
      
      // Should redirect to login, not enforce HTTPS
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });

    it('should respect DISABLE_HTTPS_ENFORCEMENT setting', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_HTTPS_ENFORCEMENT = 'true';
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      const mockValidateJWTToken = validateJWTToken as any;
      mockValidateJWTToken.mockResolvedValue({ valid: false });
      
      const request = new NextRequest('http://example.com/admin');
      const response = await middleware(request);
      
      // Should not redirect to HTTPS
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });
  });

  describe('Security Headers', () => {
    it('should add comprehensive security headers', async () => {
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      // Basic security headers
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('off');
      expect(response.headers.get('X-Download-Options')).toBe('noopen');
      expect(response.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none');
    });

    it('should add HSTS header in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should not add HSTS header in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      expect(response.headers.get('Strict-Transport-Security')).toBeNull();
    });

    it('should add Content Security Policy header', async () => {
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should include Supabase URL in CSP connect-src', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain('https://test.supabase.co');
    });

    it('should remove server information headers', async () => {
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      expect(response.headers.get('Server')).toBeNull();
      expect(response.headers.get('X-Powered-By')).toBeNull();
    });

    it('should respect DISABLE_CSP setting', async () => {
      process.env.DISABLE_CSP = 'true';
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      expect(response.headers.get('Content-Security-Policy')).toBeNull();
    });
  });

  describe('Secure Cookies', () => {
    it('should configure secure cookie options in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const { getSecureCookieOptions } = await import('@/lib/auth/security-config');
      const options = getSecureCookieOptions();
      
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
    });

    it('should configure non-secure cookie options in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const { getSecureCookieOptions } = await import('@/lib/auth/security-config');
      const options = getSecureCookieOptions();
      
      expect(options.secure).toBe(false);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should use strict CSP in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should allow unsafe-eval in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const request = new NextRequest('http://localhost:3000/');
      const response = await middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain("'unsafe-eval'");
    });

    it('should respect custom HSTS max-age', async () => {
      process.env.NODE_ENV = 'production';
      process.env.HSTS_MAX_AGE = '86400'; // 1 day
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toContain('max-age=86400');
    });

    it('should respect HSTS_INCLUDE_SUBDOMAINS setting', async () => {
      process.env.NODE_ENV = 'production';
      process.env.HSTS_INCLUDE_SUBDOMAINS = 'false';
      
      const request = new NextRequest('https://example.com/');
      const response = await middleware(request);
      
      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).not.toContain('includeSubDomains');
    });
  });

  describe('Security Header Consistency', () => {
    it('should add security headers to all responses', async () => {
      const paths = ['/', '/login', '/admin', '/api/auth/verify'];
      
      for (const path of paths) {
        const request = new NextRequest(`https://example.com${path}`);
        const response = await middleware(request);
        
        expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      }
    });

    it('should add security headers to redirect responses', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('http://example.com/admin');
      const response = await middleware(request);
      
      // Even redirect responses should have security headers
      expect(response.status).toBe(301);
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should add security headers to error responses', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      const mockValidateJWTToken = validateJWTToken as any;
      mockValidateJWTToken.mockRejectedValue(new Error('Token validation error'));
      
      const request = new NextRequest('https://example.com/admin');
      const response = await middleware(request);
      
      // Error handling should still include security headers
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});