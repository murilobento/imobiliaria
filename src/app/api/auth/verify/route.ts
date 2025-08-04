/**
 * Token verification API endpoint
 * Handles JWT token validation for protected route verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWTToken, extractUserIdFromToken } from '@/lib/auth/jwt';
import { findUserByUsername } from '@/lib/auth/database';
import { getClientIp } from '@/lib/auth/rateLimit';
import { logSecurityEvent } from '@/lib/auth/securityLogger';
import type { VerifyResponse, User } from '@/types/auth';

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
 * Create verification response with security headers
 */
function createVerifyResponse(data: VerifyResponse, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * GET /api/auth/verify
 * Verify JWT token and return user information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    // Extract token from request
    const token = extractTokenFromRequest(request);
    
    if (!token) {
      await logSecurityEvent({
        type: 'token_invalid',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { reason: 'no_token_provided' }
      });

      return createVerifyResponse(
        { success: false, error: 'No authentication token provided' },
        401
      );
    }

    // Extract user ID from token for logging (without full verification)
    const userId = extractUserIdFromToken(token);

    try {
      // Verify the token
      const payload = await verifyJWTToken(token);
      
      // Optional: Verify user still exists in database
      // This adds an extra database call but ensures the user hasn't been deleted
      let user: User;
      try {
        const dbUser = await findUserByUsername(payload.username);
        if (!dbUser) {
          // User no longer exists in database
          await logSecurityEvent({
            type: 'token_invalid',
            user_id: payload.sub,
            ip_address: ip,
            user_agent: userAgent,
            timestamp: new Date(),
            details: { 
              username: payload.username,
              reason: 'user_not_found'
            }
          });

          return createVerifyResponse(
            { success: false, error: 'User no longer exists' },
            401
          );
        }

        // Convert database user to User type
        user = {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email || '',
          role: 'admin',
          is_active: dbUser.is_active ?? true,
          created_at: dbUser.created_at,
          updated_at: dbUser.updated_at || dbUser.created_at,
          last_login: dbUser.last_login,
          created_by: dbUser.created_by || null
        };

      } catch (dbError) {
        // Database error - log but don't fail verification
        // We can still trust the JWT token even if we can't verify the user exists
        console.error('Database error during user verification:', dbError);
        
        // Create user from JWT payload
        user = {
          id: payload.sub,
          username: payload.username,
          email: '', // Not available from JWT
          role: 'admin',
          is_active: true, // Assume active if JWT is valid
          created_at: '', // Not available from JWT
          updated_at: '', // Not available from JWT
          last_login: null, // Not available from JWT
          created_by: null // Not available from JWT
        };
      }

      // Log successful verification (but don't log too frequently to avoid spam)
      // In production, you might want to throttle these logs or only log suspicious patterns
      await logSecurityEvent({
        type: 'login_success', // Using login_success for successful token verification
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          username: user.username,
          reason: 'token_verified'
        }
      });

      return createVerifyResponse({
        success: true,
        user
      });

    } catch (tokenError) {
      // Token is invalid or expired
      const errorMessage = tokenError instanceof Error ? tokenError.message : 'Unknown error';
      
      let reason = 'invalid_token';
      if (errorMessage.includes('TOKEN_EXPIRED')) {
        reason = 'token_expired';
      }

      await logSecurityEvent({
        type: 'token_invalid',
        user_id: userId || undefined,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          reason,
          token_error: errorMessage
        }
      });

      // Return appropriate error based on token error
      const status = reason === 'token_expired' ? 401 : 401;
      const message = reason === 'token_expired' 
        ? 'Token has expired' 
        : 'Invalid authentication token';

      return createVerifyResponse(
        { success: false, error: message },
        status
      );
    }

  } catch (error) {
    // Log unexpected errors
    await logSecurityEvent({
      type: 'token_invalid',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        reason: 'unexpected_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    console.error('Unexpected error in verify endpoint:', error);

    return createVerifyResponse(
      { success: false, error: 'Internal server error' },
      500
    );
  }
}

/**
 * POST /api/auth/verify
 * Alternative endpoint that accepts token in request body
 * Useful for client-side verification when cookies are not available
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
      return createVerifyResponse(
        { success: false, error: 'Invalid JSON in request body' },
        400
      );
    }

    // Extract token from body
    const { token } = body;
    
    if (!token || typeof token !== 'string') {
      await logSecurityEvent({
        type: 'token_invalid',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { reason: 'no_token_in_body' }
      });

      return createVerifyResponse(
        { success: false, error: 'Token is required in request body' },
        400
      );
    }

    // Create a new request with the token in Authorization header
    // and delegate to the GET handler
    const newRequest = new NextRequest(request.url, {
      method: 'GET',
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'authorization': `Bearer ${token}`
      }
    });

    return await GET(newRequest);

  } catch (error) {
    // Log unexpected errors
    await logSecurityEvent({
      type: 'token_invalid',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        reason: 'unexpected_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    console.error('Unexpected error in verify POST endpoint:', error);

    return createVerifyResponse(
      { success: false, error: 'Internal server error' },
      500
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'GET, POST' } }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'GET, POST' } }
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405, headers: { 'Allow': 'GET, POST' } }
  );
}