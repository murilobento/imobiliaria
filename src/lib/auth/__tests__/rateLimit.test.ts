/**
 * Unit tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock environment variables before importing the module
vi.stubEnv('RATE_LIMIT_MAX_ATTEMPTS', '5');
vi.stubEnv('RATE_LIMIT_WINDOW_MS', '900000');
vi.stubEnv('ACCOUNT_LOCK_DURATION_MS', '1800000');

import {
  checkIpRateLimit,
  checkAccountRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  checkRateLimits,
  getRateLimitHeaders,
  calculateProgressiveDelay,
  getClientIp,
  getRateLimitConfig
} from '../rateLimit';

describe('Rate Limiting System', () => {
  // Generate unique identifiers for each test to avoid conflicts
  let testCounter = 0;
  
  beforeEach(() => {
    testCounter++;
  });

  describe('checkIpRateLimit', () => {
    it('should allow requests within limit', async () => {
      const ip = `192.168.1.${testCounter}`;
      const result = await checkIpRateLimit(ip);
      
      expect(result.allowed).toBe(true);
      expect(result.type).toBe('ip');
      expect(result.remainingAttempts).toBe(5);
    });

    it('should track remaining attempts correctly', async () => {
      const ip = `192.168.2.${testCounter}`;
      
      // First attempt
      await recordFailedAttempt(ip);
      const result1 = await checkIpRateLimit(ip);
      expect(result1.remainingAttempts).toBe(4);
      
      // Second attempt
      await recordFailedAttempt(ip);
      const result2 = await checkIpRateLimit(ip);
      expect(result2.remainingAttempts).toBe(3);
    });

    it('should block after max attempts exceeded', async () => {
      const ip = `192.168.3.${testCounter}`;
      
      // Exhaust all attempts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ip);
      }
      
      const result = await checkIpRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkAccountRateLimit', () => {
    it('should allow requests within limit', async () => {
      const username = `testuser-${testCounter}`;
      const result = await checkAccountRateLimit(username);
      
      expect(result.allowed).toBe(true);
      expect(result.type).toBe('account');
      expect(result.remainingAttempts).toBe(3);
    });

    it('should track account-specific attempts', async () => {
      const username = `testuser-${testCounter}`;
      const ip = `192.168.4.${testCounter}`;
      
      // First failed attempt
      await recordFailedAttempt(ip, username);
      const result1 = await checkAccountRateLimit(username);
      expect(result1.remainingAttempts).toBe(2);
      
      // Second failed attempt
      await recordFailedAttempt(ip, username);
      const result2 = await checkAccountRateLimit(username);
      expect(result2.remainingAttempts).toBe(1);
    });

    it('should block account after 3 attempts', async () => {
      const username = `testuser-${testCounter}`;
      const ip = `192.168.5.${testCounter}`;
      
      // Exhaust all attempts
      for (let i = 0; i < 3; i++) {
        await recordFailedAttempt(ip, username);
      }
      
      const result = await checkAccountRateLimit(username);
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset IP rate limit on successful login', async () => {
      const ip = `192.168.6.${testCounter}`;
      
      // Record some failed attempts
      await recordFailedAttempt(ip);
      await recordFailedAttempt(ip);
      
      let result = await checkIpRateLimit(ip);
      expect(result.remainingAttempts).toBe(3);
      
      // Reset rate limit
      await resetRateLimit(ip);
      
      result = await checkIpRateLimit(ip);
      expect(result.remainingAttempts).toBe(5);
    });

    it('should reset account rate limit on successful login', async () => {
      const username = `testuser-${testCounter}`;
      const ip = `192.168.7.${testCounter}`;
      
      // Record some failed attempts
      await recordFailedAttempt(ip, username);
      await recordFailedAttempt(ip, username);
      
      let result = await checkAccountRateLimit(username);
      expect(result.remainingAttempts).toBe(1);
      
      // Reset rate limit
      await resetRateLimit(ip, username);
      
      result = await checkAccountRateLimit(username);
      expect(result.remainingAttempts).toBe(3);
    });
  });

  describe('checkRateLimits', () => {
    it('should check both IP and account limits', async () => {
      const ip = `192.168.8.${testCounter}`;
      const username = `testuser-${testCounter}`;
      const result = await checkRateLimits(ip, username);
      
      expect(result.allowed).toBe(true);
      expect(result.ipLimit.type).toBe('ip');
      expect(result.accountLimit?.type).toBe('account');
    });

    it('should return false if IP limit exceeded', async () => {
      const ip = `192.168.9.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      // Exhaust IP attempts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ip);
      }
      
      const result = await checkRateLimits(ip, username);
      expect(result.allowed).toBe(false);
      expect(result.ipLimit.allowed).toBe(false);
    });

    it('should return false if account limit exceeded', async () => {
      const username = `testuser-${testCounter}`;
      const ip1 = `192.168.10.${testCounter}`;
      const ip2 = `192.168.11.${testCounter}`;
      
      // Exhaust account attempts
      for (let i = 0; i < 3; i++) {
        await recordFailedAttempt(ip1, username);
      }
      
      const result = await checkRateLimits(ip2, username);
      expect(result.allowed).toBe(false);
      expect(result.accountLimit?.allowed).toBe(false);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should generate correct headers for IP rate limit', () => {
      const result = {
        allowed: true,
        remainingAttempts: 3,
        resetTime: new Date('2024-01-01T12:00:00Z'),
        type: 'ip' as const
      };
      
      const headers = getRateLimitHeaders(result);
      
      expect(headers['X-RateLimit-Remaining']).toBe('3');
      expect(headers['X-RateLimit-Reset']).toBe('1704110400');
      expect(headers['X-RateLimit-Limit']).toBe('5');
    });

    it('should generate correct headers for account rate limit', () => {
      const result = {
        allowed: false,
        remainingAttempts: 0,
        resetTime: new Date('2024-01-01T12:30:00Z'),
        retryAfter: 1800,
        type: 'account' as const
      };
      
      const headers = getRateLimitHeaders(result);
      
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['X-RateLimit-Reset']).toBe('1704112200');
      expect(headers['Retry-After']).toBe('1800');
      expect(headers['X-RateLimit-Limit']).toBe('3');
    });
  });

  describe('calculateProgressiveDelay', () => {
    it('should calculate exponential backoff delays', () => {
      expect(calculateProgressiveDelay(1)).toBeGreaterThanOrEqual(750); // ~1s ±25%
      expect(calculateProgressiveDelay(1)).toBeLessThanOrEqual(1250);
      
      expect(calculateProgressiveDelay(2)).toBeGreaterThanOrEqual(1500); // ~2s ±25%
      expect(calculateProgressiveDelay(2)).toBeLessThanOrEqual(2500);
      
      expect(calculateProgressiveDelay(3)).toBeGreaterThanOrEqual(3000); // ~4s ±25%
      expect(calculateProgressiveDelay(3)).toBeLessThanOrEqual(5000);
    });

    it('should cap delay at maximum value', () => {
      const delay = calculateProgressiveDelay(20); // Very high attempt count
      expect(delay).toBeLessThanOrEqual(375000); // Max 300s + 25% jitter
    });

    it('should add jitter to prevent thundering herd', () => {
      const delays = Array.from({ length: 10 }, () => calculateProgressiveDelay(3));
      const uniqueDelays = new Set(delays);
      
      // Should have some variation due to jitter
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1'
        }
      });
      
      expect(getClientIp(request)).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '203.0.113.2'
        }
      });
      
      expect(getClientIp(request)).toBe('203.0.113.2');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'cf-connecting-ip': '203.0.113.3'
        }
      });
      
      expect(getClientIp(request)).toBe('203.0.113.3');
    });

    it('should fallback to default IP', () => {
      const request = new Request('http://localhost');
      
      expect(getClientIp(request)).toBe('127.0.0.1');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '203.0.113.2',
          'cf-connecting-ip': '203.0.113.3'
        }
      });
      
      expect(getClientIp(request)).toBe('203.0.113.1');
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return current configuration', () => {
      const config = getRateLimitConfig();
      
      expect(config.maxAttempts).toBe(5);
      expect(config.windowMs).toBe(900000);
      expect(config.accountLockDurationMs).toBe(1800000);
    });

    it('should use environment variables', () => {
      // This test verifies that the config uses environment variables
      // Since we mocked them at module load time, they should be used
      const config = getRateLimitConfig();
      
      expect(config.maxAttempts).toBe(5); // From mocked env
      expect(config.windowMs).toBe(900000); // From mocked env
    });
  });

  describe('Integration scenarios', () => {
    it('should handle mixed IP and account rate limiting', async () => {
      const ip = `192.168.12.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      // Exhaust account attempts but not IP
      for (let i = 0; i < 3; i++) {
        await recordFailedAttempt(ip, username);
      }
      
      // Account should be blocked, but IP should still have attempts
      const ipResult = await checkIpRateLimit(ip);
      const accountResult = await checkAccountRateLimit(username);
      const combinedResult = await checkRateLimits(ip, username);
      
      expect(ipResult.allowed).toBe(true);
      expect(ipResult.remainingAttempts).toBe(2); // 5 - 3 attempts
      expect(accountResult.allowed).toBe(false);
      expect(combinedResult.allowed).toBe(false);
    });

    it('should handle successful login reset correctly', async () => {
      const ip = `192.168.13.${testCounter}`;
      const username = `testuser-${testCounter}`;
      
      // Record some failures
      await recordFailedAttempt(ip, username);
      await recordFailedAttempt(ip, username);
      
      // Check limits before reset
      const beforeReset = await checkRateLimits(ip, username);
      expect(beforeReset.ipLimit.remainingAttempts).toBe(3);
      expect(beforeReset.accountLimit?.remainingAttempts).toBe(1);
      
      // Reset on successful login
      await resetRateLimit(ip, username);
      
      // Check limits after reset
      const afterReset = await checkRateLimits(ip, username);
      expect(afterReset.ipLimit.remainingAttempts).toBe(5);
      expect(afterReset.accountLimit?.remainingAttempts).toBe(3);
    });
  });
});