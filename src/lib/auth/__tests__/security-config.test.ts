/**
 * Tests for production security configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSecurityConfig,
  generateCSPHeader,
  addSecurityHeaders,
  isHttpsRequest,
  enforceHttps,
  getSecureCookieOptions,
  validateSecurityConfig,
  logSecurityConfigStatus
} from '../security-config';

// Mock environment variables
const originalEnv = process.env;

describe('Security Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSecurityConfig', () => {
    it('should return production configuration in production environment', () => {
      process.env.NODE_ENV = 'production';
      
      const config = getSecurityConfig();
      
      expect(config.enforceHttps).toBe(true);
      expect(config.enableHSTS).toBe(true);
      expect(config.secureCookies).toBe(true);
      expect(config.cookieSameSite).toBe('strict');
    });

    it('should return development configuration in development environment', () => {
      process.env.NODE_ENV = 'development';
      
      const config = getSecurityConfig();
      
      expect(config.enforceHttps).toBe(false);
      expect(config.enableHSTS).toBe(false);
      expect(config.secureCookies).toBe(false);
      expect(config.cookieSameSite).toBe('lax');
    });

    it('should respect DISABLE_HTTPS_ENFORCEMENT environment variable', () => {
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_HTTPS_ENFORCEMENT = 'true';
      
      const config = getSecurityConfig();
      
      expect(config.enforceHttps).toBe(false);
    });

    it('should respect DISABLE_CSP environment variable', () => {
      process.env.DISABLE_CSP = 'true';
      
      const config = getSecurityConfig();
      
      expect(config.enableCSP).toBe(false);
    });

    it('should use custom HSTS settings from environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.HSTS_MAX_AGE = '86400';
      process.env.HSTS_INCLUDE_SUBDOMAINS = 'false';
      
      const config = getSecurityConfig();
      
      expect(config.hstsMaxAge).toBe(86400);
      expect(config.hstsIncludeSubdomains).toBe(false);
    });

    it('should include Supabase URL in CSP connect-src', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      
      const config = getSecurityConfig();
      
      expect(config.cspDirectives['connect-src']).toContain('https://example.supabase.co');
    });
  });

  describe('generateCSPHeader', () => {
    it('should generate valid CSP header string', () => {
      const directives = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"]
      };
      
      const csp = generateCSPHeader(directives);
      
      expect(csp).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    });

    it('should handle empty directives', () => {
      const csp = generateCSPHeader({});
      
      expect(csp).toBe('');
    });
  });

  describe('addSecurityHeaders', () => {
    it('should add all security headers to response', () => {
      const response = new NextResponse();
      
      const securedResponse = addSecurityHeaders(response);
      
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(securedResponse.headers.get('X-DNS-Prefetch-Control')).toBe('off');
      expect(securedResponse.headers.get('X-Download-Options')).toBe('noopen');
      expect(securedResponse.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none');
    });

    it('should add CSP header when enabled', () => {
      const response = new NextResponse();
      const config = getSecurityConfig();
      config.enableCSP = true;
      
      const securedResponse = addSecurityHeaders(response, config);
      
      expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should add HSTS header in production', () => {
      process.env.NODE_ENV = 'production';
      const response = new NextResponse();
      const config = getSecurityConfig();
      
      const securedResponse = addSecurityHeaders(response, config);
      
      expect(securedResponse.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(securedResponse.headers.get('Strict-Transport-Security')).toContain('includeSubDomains');
      expect(securedResponse.headers.get('Strict-Transport-Security')).toContain('preload');
    });

    it('should not add HSTS header in development', () => {
      process.env.NODE_ENV = 'development';
      const response = new NextResponse();
      const config = getSecurityConfig();
      
      const securedResponse = addSecurityHeaders(response, config);
      
      expect(securedResponse.headers.get('Strict-Transport-Security')).toBeNull();
    });

    it('should remove server information headers', () => {
      const response = new NextResponse();
      response.headers.set('Server', 'nginx');
      response.headers.set('X-Powered-By', 'Next.js');
      
      const securedResponse = addSecurityHeaders(response);
      
      expect(securedResponse.headers.get('Server')).toBeNull();
      expect(securedResponse.headers.get('X-Powered-By')).toBeNull();
    });

    it('should skip headers when disabled', () => {
      const response = new NextResponse();
      const config = getSecurityConfig();
      config.enableSecurityHeaders = false;
      
      const securedResponse = addSecurityHeaders(response, config);
      
      expect(securedResponse.headers.get('X-Frame-Options')).toBeNull();
    });
  });

  describe('isHttpsRequest', () => {
    it('should detect HTTPS from protocol', () => {
      const request = new NextRequest('https://example.com/test');
      
      expect(isHttpsRequest(request)).toBe(true);
    });

    it('should detect HTTP from protocol', () => {
      const request = new NextRequest('http://example.com/test');
      
      expect(isHttpsRequest(request)).toBe(false);
    });

    it('should detect HTTPS from x-forwarded-proto header', () => {
      const request = new NextRequest('http://example.com/test', {
        headers: { 'x-forwarded-proto': 'https' }
      });
      
      expect(isHttpsRequest(request)).toBe(true);
    });

    it('should detect HTTPS from x-forwarded-ssl header', () => {
      const request = new NextRequest('http://example.com/test', {
        headers: { 'x-forwarded-ssl': 'on' }
      });
      
      expect(isHttpsRequest(request)).toBe(true);
    });
  });

  describe('enforceHttps', () => {
    it('should redirect HTTP to HTTPS when enforcement is enabled', () => {
      process.env.NODE_ENV = 'production';
      const request = new NextRequest('http://example.com/test');
      
      const response = enforceHttps(request);
      
      expect(response).toBeTruthy();
      expect(response?.status).toBe(301);
      expect(response?.headers.get('Location')).toBe('https://example.com/test');
    });

    it('should not redirect HTTPS requests', () => {
      process.env.NODE_ENV = 'production';
      const request = new NextRequest('https://example.com/test');
      
      const response = enforceHttps(request);
      
      expect(response).toBeNull();
    });

    it('should not redirect when enforcement is disabled', () => {
      process.env.NODE_ENV = 'development';
      const request = new NextRequest('http://example.com/test');
      
      const response = enforceHttps(request);
      
      expect(response).toBeNull();
    });

    it('should add security headers to redirect response', () => {
      process.env.NODE_ENV = 'production';
      const request = new NextRequest('http://example.com/test');
      
      const response = enforceHttps(request);
      
      expect(response?.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('getSecureCookieOptions', () => {
    it('should return secure options in production', () => {
      process.env.NODE_ENV = 'production';
      
      const options = getSecureCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
    });

    it('should return non-secure options in development', () => {
      process.env.NODE_ENV = 'development';
      
      const options = getSecureCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(false);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
    });
  });

  describe('validateSecurityConfig', () => {
    it('should pass validation with proper configuration', () => {
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-testing';
      process.env.CSRF_SECRET = 'a-very-long-and-secure-csrf-secret-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation with missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('JWT_SECRET environment variable is required');
    });

    it('should fail validation with short JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('JWT_SECRET must be at least 32 characters in production');
    });

    it('should warn about short JWT_SECRET in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'short';
      process.env.CSRF_SECRET = 'test-csrf-secret';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('JWT_SECRET should be at least 32 characters');
    });

    it('should fail validation with default JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'your-super-secret-jwt-key-here-change-in-production';
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('JWT_SECRET must be changed from default value in production');
    });

    it('should warn about disabled HTTPS enforcement in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-testing';
      process.env.CSRF_SECRET = 'a-very-long-and-secure-csrf-secret-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      process.env.DISABLE_HTTPS_ENFORCEMENT = 'true';
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('HTTPS enforcement is disabled in production');
    });

    it('should warn about low HSTS max-age', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-testing';
      process.env.CSRF_SECRET = 'a-very-long-and-secure-csrf-secret-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      process.env.HSTS_MAX_AGE = '3600'; // 1 hour
      
      const validation = validateSecurityConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('HSTS max-age should be at least 86400 seconds (1 day) in production');
    });
  });

  describe('logSecurityConfigStatus', () => {
    it('should log security configuration without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-testing';
      process.env.CSRF_SECRET = 'a-very-long-and-secure-csrf-secret-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      
      logSecurityConfigStatus();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔒 Security Configuration Status:');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Security configuration is valid');
      
      consoleSpy.mockRestore();
    });

    it('should log warnings when present', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'short';
      process.env.CSRF_SECRET = 'test-csrf-secret';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      
      logSecurityConfigStatus();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Security Warnings:');
      
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});