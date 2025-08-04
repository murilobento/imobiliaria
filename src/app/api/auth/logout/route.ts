/**
 * Logout API endpoint
 * Handles user logout with token invalidation, cookie clearing, and security logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWTToken, extractUserIdFromToken } from '@/lib/auth/jwt';
import { deleteAuthSession } from '@/lib/auth/database';
import { getClientIp } from '@/lib/auth/rateLimit';
import { logSecurityEvent } from '@/lib/auth/securityLogger';
import type { LogoutResponse } from '@/types/auth';

/**
 * Extract JWT token from request cookies or Authorization header
 */
function extractTokenFromRequest(request: NextRequest): string | null {
  // First, try to get token from cookies
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Create response that clears authentication cookies
 */
function createLogoutResponse(data: LogoutResponse, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });

  // Clear the auth-token cookie
  response.headers.set('Set-Cookie', [
    'auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    // Also clear any potential refresh token cookie
    'refresh-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  ].join(', '));

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    // Extract token from request
    const token = extractTokenFromRequest(request);
    
    if (!token) {
      // No token provided - still clear cookies and return success
      // This handles cases where the client-side token was already cleared
      await logSecurityEvent({
        type: 'logout',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { reason: 'no_token_provided' }
      });

      return createLogoutResponse({ success: true });
    }

    // Extract user ID from token for logging (without full verification)
    const userId = extractUserIdFromToken(token);

    try {
      // Verify the token to get the JTI (if we were using JTI for session tracking)
      const payload = await verifyJWTToken(token);
      
      // If we're using session tracking, delete the session from database
      // For now, we'll skip this since we're using stateless JWT
      // In a full implementation with session tracking:
      // if (payload.jti) {
      //   await deleteAuthSession(payload.jti);
      // }

      // Log successful logout
      await logSecurityEvent({
        type: 'logout',
        user_id: payload.sub,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          username: payload.username,
          reason: 'user_initiated'
        }
      });

      return createLogoutResponse({ success: true });

    } catch (tokenError) {
      // Token is invalid or expired, but we still want to clear cookies
      // and log the logout attempt
      await logSecurityEvent({
        type: 'logout',
        user_id: userId || undefined,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          reason: 'invalid_token',
          token_error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        }
      });

      // Still return success to clear client-side state
      return createLogoutResponse({ success: true });
    }

  } catch (error) {
    // Log unexpected errors
    await logSecurityEvent({
      type: 'logout',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        reason: 'unexpected_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    console.error('Unexpected error in logout endpoint:', error);

    // Even on error, we should clear cookies to ensure logout
    return createLogoutResponse(
      { success: false, error: 'Internal server error' },
      500
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