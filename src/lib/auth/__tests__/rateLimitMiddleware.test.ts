/**
 * Unit tests for rate limiting middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock environment variables before importing the module
vi.stubEnv('RATE_LIMIT_MAX_ATTEMPTS', '5');
vi.stubEnv('RATE_LIMIT_WINDOW_MS', '900000');
vi.stubEnv('ACCOUNT_LOCK_DURATION_MS', '1800000');

import {
  createRateLimitMiddleware,
  rateLimitMiddleware,
  handleFailedAuth,
  handleSuccessfulAuth,
  addRateLimitHeaders,
  withRateLimit,
  getRateLimitInfo
} from '../rateLimitMiddleware';

describe('Rate Limiting Middleware', () => {
  let testCounter = 0;
  
  beforeEach(() => {
    testCounter++;
  });

  describe('createRateLimitMiddleware', () => {
    it('should create middleware that allows requests within limits', async () => {
      const middleware = createRateLimitMiddleware();
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': `192.168.1.${testCounter}` }
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
      expect(result.ipLimit.allowed).toBe(true);
      expect(result.ipLimit.remainingAttempts).toBe(5);
    });

    it('should block requests when IP limit exceeded', async () => {
      const middleware = createRateLimitMiddleware();
      const ip = `192.168.2.${testCounter}`;
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Exhaust IP attempts
      for (let i = 0; i < 5; i++) {
        await handleFailedAuth(request);
      }

      const result = await middleware(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.ipLimit.allowed).toBe(false);
    });

    it('should block requests when account limit exceeded', async () => {
      const middleware = createRateLimitMiddleware();
      const ip = `192.168.3.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Exhaust account attempts
      for (let i = 0; i < 3; i++) {
        await handleFailedAuth(request, username);
      }

      const result = await middleware(request, username);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.accountLimit?.allowed).toBe(false);
    });

    it('should call onLimitReached callback when limit exceeded', async () => {
      const onLimitReached = vi.fn();
      const middleware = createRateLimitMiddleware({ onLimitReached });
      const ip = `192.168.4.${testCounter}`;
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Exhaust IP attempts
      for (let i = 0; i < 5; i++) {
        await handleFailedAuth(request);
      }

      await middleware(request);

      expect(onLimitReached).toHaveBeenCalledWith(request, expect.objectContaining({
        allowed: false,
        type: 'ip'
      }));
    });

    it('should use custom key generator', async () => {
      const keyGenerator = vi.fn().mockReturnValue(`custom-key-${testCounter}`);
      const middleware = createRateLimitMiddleware({ keyGenerator });
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST'
      });

      await middleware(request);

      expect(keyGenerator).toHaveBeenCalledWith(request);
    });
  });

  describe('handleFailedAuth', () => {
    it('should record failed authentication attempt', async () => {
      const ip = `192.168.5.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      await handleFailedAuth(request, username);

      // Verify that the attempt was recorded by checking the middleware
      const result = await rateLimitMiddleware(request, username);
      expect(result.ipLimit.remainingAttempts).toBe(4);
      expect(result.accountLimit?.remainingAttempts).toBe(2);
    });
  });

  describe('handleSuccessfulAuth', () => {
    it('should reset rate limits on successful authentication', async () => {
      const ip = `192.168.6.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Record some failed attempts
      await handleFailedAuth(request, username);
      await handleFailedAuth(request, username);

      // Verify attempts were recorded
      let result = await rateLimitMiddleware(request, username);
      expect(result.ipLimit.remainingAttempts).toBe(3);
      expect(result.accountLimit?.remainingAttempts).toBe(1);

      // Reset on successful auth
      await handleSuccessfulAuth(request, username);

      // Verify limits were reset
      result = await rateLimitMiddleware(request, username);
      expect(result.ipLimit.remainingAttempts).toBe(5);
      expect(result.accountLimit?.remainingAttempts).toBe(3);
    });
  });

  describe('addRateLimitHeaders', () => {
    it('should add IP rate limit headers to response', () => {
      const response = NextResponse.json({ success: true });
      const ipLimit = {
        allowed: true,
        remainingAttempts: 3,
        resetTime: new Date('2024-01-01T12:00:00Z'),
        type: 'ip' as const
      };

      const updatedResponse = addRateLimitHeaders(response, ipLimit);

      expect(updatedResponse.headers.get('X-RateLimit-Remaining-IP')).toBe('3');
      expect(updatedResponse.headers.get('X-RateLimit-Reset-IP')).toBe('1704110400');
      expect(updatedResponse.headers.get('X-RateLimit-Limit-IP')).toBe('5');
    });

    it('should add both IP and account rate limit headers', () => {
      const response = NextResponse.json({ success: true });
      const ipLimit = {
        allowed: true,
        remainingAttempts: 4,
        resetTime: new Date('2024-01-01T12:00:00Z'),
        type: 'ip' as const
      };
      const accountLimit = {
        allowed: true,
        remainingAttempts: 2,
        resetTime: new Date('2024-01-01T12:30:00Z'),
        type: 'account' as const
      };

      const updatedResponse = addRateLimitHeaders(response, ipLimit, accountLimit);

      expect(updatedResponse.headers.get('X-RateLimit-Remaining-IP')).toBe('4');
      expect(updatedResponse.headers.get('X-RateLimit-Limit-IP')).toBe('5');
      expect(updatedResponse.headers.get('X-RateLimit-Remaining-Account')).toBe('2');
      expect(updatedResponse.headers.get('X-RateLimit-Limit-Account')).toBe('3');
    });
  });

  describe('withRateLimit', () => {
    it('should wrap handler with rate limiting', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler);
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': `192.168.7.${testCounter}` }
      });

      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(request);
      expect(response.headers.get('X-RateLimit-Remaining-IP')).toBe('5');
    });

    it('should block request when rate limit exceeded', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler);
      
      const ip = `192.168.8.${testCounter}`;
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await handleFailedAuth(request);
      }

      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      
      const body = await response.json();
      expect(body.error).toBe('RATE_LIMITED');
    });

    it('should extract username from POST request body', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler);
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 
          'x-forwarded-for': `192.168.9.${testCounter}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: `testuser-${testCounter}`, password: 'password' })
      });

      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(request);
      expect(response.headers.get('X-RateLimit-Remaining-Account')).toBe('3');
    });

    it('should handle handler errors and record failed attempts', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = withRateLimit(handler);
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': `192.168.10.${testCounter}` }
      });

      await expect(wrappedHandler(request)).rejects.toThrow('Handler error');

      // Verify failed attempt was recorded
      const result = await rateLimitMiddleware(request);
      expect(result.ipLimit.remainingAttempts).toBe(4);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should convert rate limit result to info format', () => {
      const result = {
        allowed: true,
        remainingAttempts: 3,
        resetTime: new Date('2024-01-01T12:00:00Z'),
        retryAfter: 300,
        type: 'ip' as const
      };

      const info = getRateLimitInfo(result);

      expect(info.limit).toBe(5);
      expect(info.remaining).toBe(3);
      expect(info.reset).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(info.retryAfter).toBe(300);
    });

    it('should handle account type limits', () => {
      const result = {
        allowed: false,
        remainingAttempts: 0,
        resetTime: new Date('2024-01-01T12:30:00Z'),
        type: 'account' as const
      };

      const info = getRateLimitInfo(result);

      expect(info.limit).toBe(3);
      expect(info.remaining).toBe(0);
      expect(info.reset).toEqual(new Date('2024-01-01T12:30:00Z'));
    });
  });

  describe('Integration scenarios', () => {
    it('should handle mixed rate limiting scenarios', async () => {
      const ip = `192.168.11.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Exhaust account limit but not IP limit
      for (let i = 0; i < 3; i++) {
        await handleFailedAuth(request, username);
      }

      const result = await rateLimitMiddleware(request, username);

      expect(result.success).toBe(false);
      expect(result.ipLimit.allowed).toBe(true);
      expect(result.ipLimit.remainingAttempts).toBe(2); // 5 - 3 attempts
      expect(result.accountLimit?.allowed).toBe(false);
      expect(result.accountLimit?.remainingAttempts).toBe(0);
    });

    it('should properly handle rate limit response format', async () => {
      const ip = `192.168.12.${testCounter}`;
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip }
      });

      // Exhaust IP limit
      for (let i = 0; i < 5; i++) {
        await handleFailedAuth(request);
      }

      const result = await rateLimitMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();

      const response = result.response!;
      expect(response.status).toBe(429);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('RATE_LIMITED');
      expect(body.message).toContain('Too many requests from this IP address');
      expect(body.retryAfter).toBeGreaterThan(0);

      // Check headers
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });
});