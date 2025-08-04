/**
 * Rate limiting utilities for authentication system
 * Implements both IP-based and account-based rate limiting with progressive delays
 */

import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import type { RateLimitConfig } from '@/types/auth';

// Rate limiter instances
let ipRateLimiter: RateLimiterMemory;
let accountRateLimiter: RateLimiterMemory;

// Configuration
const config: RateLimitConfig = {
  maxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  accountLockDurationMs: parseInt(process.env.ACCOUNT_LOCK_DURATION_MS || '1800000'), // 30 minutes
};

/**
 * Initialize rate limiters with configuration
 */
function initializeRateLimiters() {
  if (!ipRateLimiter) {
    // IP-based rate limiter: 5 attempts per 15 minutes
    ipRateLimiter = new RateLimiterMemory({
      keyPrefix: 'ip_login_fail',
      points: config.maxAttempts,
      duration: Math.floor(config.windowMs / 1000), // Convert to seconds
      blockDuration: Math.floor(config.windowMs / 1000), // Block for same duration
    });
  }

  if (!accountRateLimiter) {
    // Account-based rate limiter: 3 attempts then progressive delays
    accountRateLimiter = new RateLimiterMemory({
      keyPrefix: 'account_login_fail',
      points: 3, // Allow 3 attempts before blocking
      duration: Math.floor(config.accountLockDurationMs / 1000), // 30 minutes window
      blockDuration: Math.floor(config.accountLockDurationMs / 1000), // Block for 30 minutes
    });
  }
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  resetTime?: Date;
  retryAfter?: number; // seconds
  type: 'ip' | 'account';
}

/**
 * Check IP-based rate limit
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  initializeRateLimiters();

  const result = await ipRateLimiter.get(ip);
  const remainingAttempts = result?.remainingPoints ?? config.maxAttempts;
  const allowed = remainingAttempts > 0;
  
  return {
    allowed,
    remainingAttempts,
    resetTime: result?.msBeforeNext ? new Date(Date.now() + result.msBeforeNext) : undefined,
    retryAfter: !allowed && result?.msBeforeNext ? Math.ceil(result.msBeforeNext / 1000) : undefined,
    type: 'ip'
  };
}

/**
 * Check account-based rate limit
 */
export async function checkAccountRateLimit(username: string): Promise<RateLimitResult> {
  initializeRateLimiters();

  const result = await accountRateLimiter.get(username);
  const remainingAttempts = result?.remainingPoints ?? 3;
  const allowed = remainingAttempts > 0;
  
  return {
    allowed,
    remainingAttempts,
    resetTime: result?.msBeforeNext ? new Date(Date.now() + result.msBeforeNext) : undefined,
    retryAfter: !allowed && result?.msBeforeNext ? Math.ceil(result.msBeforeNext / 1000) : undefined,
    type: 'account'
  };
}

/**
 * Record a failed login attempt for both IP and account
 */
export async function recordFailedAttempt(ip: string, username?: string): Promise<void> {
  initializeRateLimiters();

  // Record IP-based failure
  try {
    await ipRateLimiter.consume(ip);
  } catch (error) {
    // IP is now rate limited, but we still want to record the attempt
  }

  // Record account-based failure if username provided
  if (username) {
    try {
      await accountRateLimiter.consume(username);
    } catch (error) {
      // Account is now rate limited, but we still want to record the attempt
    }
  }
}

/**
 * Reset rate limit for successful login
 */
export async function resetRateLimit(ip: string, username?: string): Promise<void> {
  initializeRateLimiters();

  // Reset IP-based rate limit
  await ipRateLimiter.delete(ip);

  // Reset account-based rate limit if username provided
  if (username) {
    await accountRateLimiter.delete(username);
  }
}

/**
 * Check both IP and account rate limits
 */
export async function checkRateLimits(ip: string, username?: string): Promise<{
  ipLimit: RateLimitResult;
  accountLimit?: RateLimitResult;
  allowed: boolean;
}> {
  const ipLimit = await checkIpRateLimit(ip);
  let accountLimit: RateLimitResult | undefined;

  if (username) {
    accountLimit = await checkAccountRateLimit(username);
  }

  const allowed = ipLimit.allowed && (accountLimit?.allowed !== false);

  return {
    ipLimit,
    accountLimit,
    allowed
  };
}

/**
 * Get rate limit headers for API responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {};

  if (result.remainingAttempts !== undefined) {
    headers['X-RateLimit-Remaining'] = result.remainingAttempts.toString();
  }

  if (result.resetTime) {
    headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime.getTime() / 1000).toString();
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  headers['X-RateLimit-Limit'] = result.type === 'ip' 
    ? config.maxAttempts.toString() 
    : '3';

  return headers;
}

/**
 * Progressive delay calculation for repeated failures
 * Implements exponential backoff with jitter
 */
export function calculateProgressiveDelay(attemptCount: number): number {
  // Base delay starts at 1 second, doubles each attempt, max 300 seconds (5 minutes)
  const baseDelay = Math.min(Math.pow(2, attemptCount - 1), 300);
  
  // Add jitter (±25% randomization)
  const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
  
  return Math.floor((baseDelay + jitter) * 1000); // Return in milliseconds
}

/**
 * Middleware helper to extract client IP
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default IP for development
  return '127.0.0.1';
}

/**
 * Rate limit configuration getter
 */
export function getRateLimitConfig(): RateLimitConfig {
  return { ...config };
}