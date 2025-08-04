/**
 * Rate limiting middleware for API routes
 * Provides easy integration with Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimits, 
  recordFailedAttempt, 
  resetRateLimit, 
  getRateLimitHeaders, 
  getClientIp,
  type RateLimitResult 
} from './rateLimit';

/**
 * Rate limit middleware options
 */
export interface RateLimitMiddlewareOptions {
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
  onLimitReached?: (request: NextRequest, result: RateLimitResult) => void;
}

/**
 * Rate limit middleware result
 */
export interface RateLimitMiddlewareResult {
  success: boolean;
  response?: NextResponse;
  ipLimit: RateLimitResult;
  accountLimit?: RateLimitResult;
}

/**
 * Create rate limiting middleware for API routes
 */
export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions = {}) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    username?: string
  ): Promise<RateLimitMiddlewareResult> {
    const ip = options.keyGenerator ? options.keyGenerator(request) : getClientIp(request);
    
    // Check rate limits
    const { ipLimit, accountLimit, allowed } = await checkRateLimits(ip, username);
    
    if (!allowed) {
      // Determine which limit was hit
      const limitHit = !ipLimit.allowed ? ipLimit : accountLimit!;
      
      // Call onLimitReached callback if provided
      if (options.onLimitReached) {
        options.onLimitReached(request, limitHit);
      }
      
      // Create rate limit response
      const headers = getRateLimitHeaders(limitHit);
      const response = NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: limitHit.type === 'ip' 
            ? 'Too many requests from this IP address. Please try again later.'
            : 'Too many failed login attempts for this account. Please try again later.',
          retryAfter: limitHit.retryAfter
        },
        { 
          status: 429,
          headers
        }
      );
      
      return {
        success: false,
        response,
        ipLimit,
        accountLimit
      };
    }
    
    return {
      success: true,
      ipLimit,
      accountLimit
    };
  };
}

/**
 * Default rate limit middleware instance
 */
export const rateLimitMiddleware = createRateLimitMiddleware();

/**
 * Handle failed authentication attempt
 */
export async function handleFailedAuth(request: NextRequest, username?: string): Promise<void> {
  const ip = getClientIp(request);
  await recordFailedAttempt(ip, username);
}

/**
 * Handle successful authentication attempt
 */
export async function handleSuccessfulAuth(request: NextRequest, username?: string): Promise<void> {
  const ip = getClientIp(request);
  await resetRateLimit(ip, username);
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse, 
  ipLimit: RateLimitResult, 
  accountLimit?: RateLimitResult
): NextResponse {
  // Add IP rate limit headers
  const ipHeaders = getRateLimitHeaders(ipLimit);
  Object.entries(ipHeaders).forEach(([key, value]) => {
    response.headers.set(`${key}-IP`, value);
  });
  
  // Add account rate limit headers if available
  if (accountLimit) {
    const accountHeaders = getRateLimitHeaders(accountLimit);
    Object.entries(accountHeaders).forEach(([key, value]) => {
      response.headers.set(`${key}-Account`, value);
    });
  }
  
  return response;
}

/**
 * Wrapper function for API routes with automatic rate limiting
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions = {}
) {
  return async function rateLimitedHandler(
    request: NextRequest, 
    ...args: T
  ): Promise<NextResponse> {
    const middleware = createRateLimitMiddleware(options);
    
    // Extract username from request body if it's a login request
    let username: string | undefined;
    if (request.method === 'POST') {
      try {
        const body = await request.clone().json();
        username = body.username;
      } catch {
        // Ignore JSON parsing errors
      }
    }
    
    const result = await middleware(request, username);
    
    if (!result.success) {
      return result.response!;
    }
    
    try {
      const response = await handler(request, ...args);
      
      // Add rate limit headers to successful responses
      return addRateLimitHeaders(response, result.ipLimit, result.accountLimit);
    } catch (error) {
      // Handle failed requests
      if (!options.skipFailedRequests) {
        await handleFailedAuth(request, username);
      }
      throw error;
    }
  };
}

/**
 * Express-style middleware for compatibility
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export function getRateLimitInfo(result: RateLimitResult): RateLimitInfo {
  return {
    limit: result.type === 'ip' ? 5 : 3,
    remaining: result.remainingAttempts || 0,
    reset: result.resetTime || new Date(),
    retryAfter: result.retryAfter
  };
}