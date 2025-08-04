/**
 * Admin User Management API endpoints
 * Handles user listing and creation by administrators
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseAdmin } from '@/lib/auth/supabase-auth-utils';
import { 
  getSupabaseUsersList, 
  createSupabaseUser, 
  checkSupabaseEmailAvailability,
  type SupabaseUser,
  type UserListResponse
} from '@/lib/auth/supabase-admin';
import { rateLimitMiddleware } from '@/lib/auth/rateLimitMiddleware';
import { getClientIp } from '@/lib/auth/rateLimit';
import { logSecurityEvent } from '@/lib/auth/securityLogger';
import { validateCreateUser, sanitizeInput } from '@/lib/utils/validation';

/**
 * Convert Supabase auth result to User format for compatibility
 */
function convertToUser(supabaseUser: { id: string; email: string; role: string }): SupabaseUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    role: supabaseUser.role,
    created_at: new Date().toISOString(),
    last_sign_in_at: null,
    email_confirmed_at: new Date().toISOString(),
    is_active: true
  };
}

/**
 * Create response with security headers
 */
function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * GET /api/admin/users
 * List users with pagination and search
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    // Authenticate admin
    const authResult = await authenticateSupabaseAdmin(request);
    if (!authResult.success) {
      await logSecurityEvent({
        type: 'unauthorized_access',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          endpoint: '/api/admin/users',
          method: 'GET',
          reason: authResult.error
        }
      });

      return createSecureResponse(
        { success: false, error: authResult.error },
        authResult.status || 401
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 per page
    const search = searchParams.get('search') || undefined;

    // Validate pagination parameters
    if (page < 1) {
      return createSecureResponse(
        { success: false, error: 'Page must be greater than 0' },
        400
      );
    }

    if (limit < 1) {
      return createSecureResponse(
        { success: false, error: 'Limit must be greater than 0' },
        400
      );
    }

    // Get users list from Supabase
    const usersList = await getSupabaseUsersList(page, limit, search);

    // Convert Supabase user to User format
    const user = convertToUser(authResult.user!);

    // Log successful access
    await logSecurityEvent({
      type: 'admin_action',
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        action: 'list_users',
        page,
        limit,
        search: search || null,
        total_results: usersList.total
      }
    });

    return createSecureResponse({
      success: true,
      data: usersList
    });

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);

    await logSecurityEvent({
      type: 'system_error',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        endpoint: '/api/admin/users',
        method: 'GET',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return createSecureResponse(
      { success: false, error: 'Internal server error' },
      500
    );
  }
}

/**
 * POST /api/admin/users
 * Create new user (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(request);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          endpoint: '/api/admin/users',
          method: 'POST'
        }
      });

      return rateLimitResult.response!;
    }

    // Authenticate admin
    const authResult = await authenticateSupabaseAdmin(request);
    if (!authResult.success) {
      await logSecurityEvent({
        type: 'unauthorized_access',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: { 
          endpoint: '/api/admin/users',
          method: 'POST',
          reason: authResult.error
        }
      });

      return createSecureResponse(
        { success: false, error: authResult.error },
        authResult.status || 401
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createSecureResponse(
        { success: false, error: 'Invalid JSON in request body' },
        400
      );
    }

    // Sanitize input
    const sanitizedData = sanitizeInput(body);

    // Check email availability (Supabase uses email as unique identifier)
    const isEmailAvailable = await checkSupabaseEmailAvailability(sanitizedData.email);
    
    if (!isEmailAvailable) {
      return createSecureResponse(
        { 
          success: false, 
          error: 'Email already exists',
          field: 'email'
        },
        409
      );
    }

    // Validate user data
    const validation = validateCreateUser(sanitizedData);
    
    if (!validation.isValid) {
      return createSecureResponse(
        { 
          success: false, 
          error: 'Validation failed',
          errors: validation.errors
        },
        400
      );
    }

    // Convert Supabase user to User format
    const user = convertToUser(authResult.user!);

    // Create user in Supabase Auth
    const newUser = await createSupabaseUser(
      sanitizedData.email,
      sanitizedData.password,
      sanitizedData.role || 'real-estate-agent', // Use role from request or default
      sanitizedData.fullName || sanitizedData.username || sanitizedData.email.split('@')[0]
    );

    // Log successful user creation
    await logSecurityEvent({
      type: 'admin_action',
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        action: 'create_user',
        created_user_id: newUser.id,
        created_email: newUser.email
      }
    });

    return createSecureResponse({
      success: true,
      data: newUser,
      message: 'User created successfully'
    }, 201);

  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);

    await logSecurityEvent({
      type: 'system_error',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: { 
        endpoint: '/api/admin/users',
        method: 'POST',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return createSecureResponse(
      { success: false, error: 'Internal server error' },
      500
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT(): Promise<NextResponse> {
  return createSecureResponse(
    { success: false, error: 'Method not allowed' },
    405
  );
}

export async function DELETE(): Promise<NextResponse> {
  return createSecureResponse(
    { success: false, error: 'Method not allowed' },
    405
  );
}

export async function PATCH(): Promise<NextResponse> {
  return createSecureResponse(
    { success: false, error: 'Method not allowed' },
    405
  );
}