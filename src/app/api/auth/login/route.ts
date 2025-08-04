/**
 * Login API endpoint
 * Handles user authentication with credential validation, rate limiting, and security logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyUserPassword, updateLastLogin } from '@/lib/auth/database';
import { generateJWTToken } from '@/lib/auth/jwt';
import { rateLimitMiddleware, handleFailedAuth, handleSuccessfulAuth } from '@/lib/auth/rateLimitMiddleware';
import { getClientIp } from '@/lib/auth/rateLimit';
import { logSecurityEvent } from '@/lib/auth/securityLogger';
import { getSecureCookieOptions } from '@/lib/auth/security-config';
import type { LoginFormData, LoginResponse, User } from '@/types/auth';

/**
 * Validate login request body
 */
function validateLoginRequest(body: any): { valid: boolean; data?: LoginFormData; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { username, password } = body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return { valid: false, error: 'Username is required' };
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return { valid: false, error: 'Password is required' };
  }

  // Basic input sanitization
  const sanitizedUsername = username.trim().toLowerCase();
  
  if (sanitizedUsername.length > 50) {
    return { valid: false, error: 'Username is too long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' };
  }

  return {
    valid: true,
    data: {
      username: sanitizedUsername,
      password
    }
  };
}

/**
 * Create secure HTTP-only cookie for JWT token
 */
function createAuthCookie(token: string): string {
  const maxAge = 60 * 60; // 1 hour in seconds
  const secureOptions = getSecureCookieOptions();
  
  const cookieOptions = [
    `auth-token=${token}`,
    `Max-Age=${maxAge}`,
    `Path=${secureOptions.path}`,
    'HttpOnly',
    `SameSite=${secureOptions.sameSite}`
  ];

  if (secureOptions.secure) {
    cookieOptions.push('Secure');
  }

  return cookieOptions.join('; ');
}

/**
 * POST /api/auth/login
 * Authenticate user with username and password
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' } as LoginResponse,
        { status: 400 }
      );
    }

    // Validate request data
    const validation = validateLoginRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error } as LoginResponse,
        { status: 400 }
      );
    }

    const { username, password } = validation.data!;

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, username);
    if (!rateLimitResult.success) {
      // Log failed attempt due to rate limiting
      await logSecurityEvent({
        type: 'login_attempt',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          username, 
          reason: 'rate_limited',
          limit_type: rateLimitResult.response?.headers.get('X-RateLimit-Limit-IP') ? 'ip' : 'account'
        }
      });

      return rateLimitResult.response!;
    }

    // Log login attempt
    await logSecurityEvent({
      type: 'login_attempt',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { username }
    });

    // Verify credentials
    let user;
    try {
      user = await verifyUserPassword(username, password);
    } catch (error) {
      // Handle account locked error specifically
      if (error instanceof Error && error.message.includes('locked')) {
        await logSecurityEvent({
          type: 'login_failure',
          ip_address: ip,
          user_agent: userAgent,
          timestamp: new Date(),
          details: { username, reason: 'account_locked' }
        });

        return NextResponse.json(
          { success: false, error: 'Account is temporarily locked due to too many failed attempts' } as LoginResponse,
          { status: 423 } // 423 Locked
        );
      }

      // Log database error
      await logSecurityEvent({
        type: 'login_failure',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { username, reason: 'database_error' }
      });

      return NextResponse.json(
        { success: false, error: 'Authentication failed' } as LoginResponse,
        { status: 500 }
      );
    }

    if (!user) {
      // Invalid credentials - record failed attempt
      await handleFailedAuth(request, username);

      await logSecurityEvent({
        type: 'login_failure',
        user_id: undefined,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { username, reason: 'invalid_credentials' }
      });

      // Generic error message to prevent username enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' } as LoginResponse,
        { status: 401 }
      );
    }

    // Generate JWT token
    let token;
    try {
      const userForToken: User = {
        id: user.id,
        username: user.username,
        email: user.email || '',
        role: 'admin',
        is_active: user.is_active ?? true,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        last_login: user.last_login,
        created_by: user.created_by || null
      };

      token = await generateJWTToken(userForToken);
    } catch (error) {
      await logSecurityEvent({
        type: 'login_failure',
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { username, reason: 'token_generation_failed' }
      });

      return NextResponse.json(
        { success: false, error: 'Authentication failed' } as LoginResponse,
        { status: 500 }
      );
    }

    // Update last login timestamp
    try {
      await updateLastLogin(user.id);
    } catch (error) {
      // Log but don't fail the login for this
      console.error('Failed to update last login:', error);
    }

    // Reset rate limits on successful login
    await handleSuccessfulAuth(request, username);

    // Log successful login
    await logSecurityEvent({
      type: 'login_success',
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { username }
    });

    // Create response with secure cookie
    const userResponse: User = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      role: 'admin',
      is_active: user.is_active ?? true,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
      last_login: new Date().toISOString(), // Use current time since we just updated it
      created_by: user.created_by || null
    };

    const response = NextResponse.json(
      { success: true, user: userResponse } as LoginResponse,
      { status: 200 }
    );

    // Set secure HTTP-only cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error) {
    // Log unexpected errors
    await logSecurityEvent({
      type: 'login_failure',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        reason: 'unexpected_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    console.error('Unexpected error in login endpoint:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' } as LoginResponse,
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'POST' } }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'POST' } }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'POST' } }
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'POST' } }
  );
}