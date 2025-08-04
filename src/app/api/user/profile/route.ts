/**
 * User Profile API
 * Allows users to update their own personal data
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils';
import { updateSupabaseUser, type SupabaseUser } from '@/lib/auth/supabase-admin';
import { getClientIp } from '@/lib/auth/rateLimit';
import { logSecurityEvent } from '@/lib/auth/securityLogger';
import { sanitizeInput } from '@/lib/utils/validation';

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
 * PATCH /api/user/profile
 * Update user's own profile data
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    // Authenticate user
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      await logSecurityEvent({
        type: 'unauthorized_access',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          endpoint: '/api/user/profile',
          method: 'PATCH',
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

    // Validate personal data fields
    if (sanitizedData.fullName !== undefined) {
      if (!sanitizedData.fullName || sanitizedData.fullName.trim().length < 2) {
        return createSecureResponse(
          { success: false, error: 'Nome completo deve ter pelo menos 2 caracteres' },
          400
        );
      }
      if (sanitizedData.fullName.trim().length > 100) {
        return createSecureResponse(
          { success: false, error: 'Nome completo deve ter no máximo 100 caracteres' },
          400
        );
      }
    }

    if (sanitizedData.username !== undefined) {
      if (!sanitizedData.username || sanitizedData.username.trim().length < 3) {
        return createSecureResponse(
          { success: false, error: 'Nome de usuário deve ter pelo menos 3 caracteres' },
          400
        );
      }
    }

    if (sanitizedData.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedData.email)) {
        return createSecureResponse(
          { success: false, error: 'Email deve ter um formato válido' },
          400
        );
      }
    }

    // At least one field must be provided
    const hasUpdates = sanitizedData.fullName !== undefined ||
      sanitizedData.username !== undefined ||
      sanitizedData.email !== undefined;

    if (!hasUpdates) {
      return createSecureResponse(
        { success: false, error: 'Pelo menos um campo deve ser fornecido para atualização' },
        400
      );
    }

    // Update user's own profile in Supabase
    const updatedUser = await updateSupabaseUser(authResult.user!.id, {
      fullName: sanitizedData.fullName,
      username: sanitizedData.username,
      email: sanitizedData.email
    });

    // Log successful profile update
    await logSecurityEvent({
      type: 'admin_action',
      user_id: authResult.user!.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        action: 'update_profile',
        updated_fields: Object.keys(sanitizedData).filter(key =>
          ['fullName', 'username', 'email'].includes(key) && sanitizedData[key] !== undefined
        )
      }
    });

    return createSecureResponse({
      success: true,
      data: updatedUser,
      message: 'Perfil atualizado com sucesso'
    });

  } catch (error) {
    console.error('Error in PATCH /api/user/profile:', error);

    await logSecurityEvent({
      type: 'system_error',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        endpoint: '/api/user/profile',
        method: 'PATCH',
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
 * GET /api/user/profile
 * Get user's own profile data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    // Authenticate user
    const authResult = await authenticateSupabaseUser(request);
    if (!authResult.success) {
      await logSecurityEvent({
        type: 'unauthorized_access',
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          endpoint: '/api/user/profile',
          method: 'GET',
          reason: authResult.error
        }
      });

      return createSecureResponse(
        { success: false, error: authResult.error },
        authResult.status || 401
      );
    }

    // Get fresh user data from Supabase Admin API to ensure we have the latest data
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: freshUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(authResult.user!.id);

    // Use fresh data from admin API if available, otherwise fallback to token data
    const userData = (getUserError || !freshUserData.user) ? authResult.user! : freshUserData.user;

    if (getUserError) {
      console.error('Error getting fresh user data:', getUserError);
    }

    // Return user's profile data with safe property access
    const profileData = {
      id: userData.id,
      email: userData.email || '',
      fullName: (userData as any).user_metadata?.name || '',
      username: (userData as any).user_metadata?.username || userData.email?.split('@')[0] || '',
      role: (userData as any).user_metadata?.role || 'real-estate-agent',
      created_at: (userData as any).created_at || new Date().toISOString(),
      last_sign_in_at: (userData as any).last_sign_in_at || null,
      email_confirmed_at: (userData as any).email_confirmed_at || null
    };

    return createSecureResponse({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);

    await logSecurityEvent({
      type: 'system_error',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        endpoint: '/api/user/profile',
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

export async function POST(): Promise<NextResponse> {
  return createSecureResponse(
    { success: false, error: 'Method not allowed' },
    405
  );
}

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