/**
 * User Password Change API
 * Allows users to change their own password
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils';
import { getClientIp } from '@/lib/auth/rateLimit';
import { logSecurityEvent } from '@/lib/auth/securityLogger';
import { sanitizeInput } from '@/lib/utils/validation';
import { validateChangePassword } from '@/lib/utils/validation';

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
 * PATCH /api/user/password
 * Change user's own password
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
          endpoint: '/api/user/password',
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

    // Validate required fields
    if (!sanitizedData.currentPassword || !sanitizedData.newPassword || !sanitizedData.confirmPassword) {
      return createSecureResponse(
        { success: false, error: 'Todos os campos são obrigatórios' },
        400
      );
    }

    // Validate password change data
    const validation = validateChangePassword(sanitizedData);
    if (!validation.isValid) {
      const errorDetails: Record<string, string[]> = {};
      validation.errors.forEach(error => {
        if (!errorDetails[error.field]) {
          errorDetails[error.field] = [];
        }
        errorDetails[error.field].push(error.message);
      });

      return createSecureResponse(
        { 
          success: false, 
          error: 'Dados de senha inválidos',
          details: errorDetails
        },
        400
      );
    }

    // Use Supabase Auth to change password
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

    // Create a user client to verify current password
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { error: signInError } = await supabaseUser.auth.signInWithPassword({
      email: authResult.user!.email!,
      password: sanitizedData.currentPassword
    });

    if (signInError) {
      await logSecurityEvent({
        type: 'admin_action',
        user_id: authResult.user!.id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          action: 'password_change_failed',
          reason: 'invalid_current_password'
        }
      });

      return createSecureResponse(
        { 
          success: false, 
          error: 'Senha atual incorreta',
          field: 'currentPassword'
        },
        400
      );
    }

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authResult.user!.id,
      { password: sanitizedData.newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      
      await logSecurityEvent({
        type: 'system_error',
        user_id: authResult.user!.id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date(),
        details: {
          endpoint: '/api/user/password',
          method: 'PATCH',
          error: updateError.message
        }
      });

      return createSecureResponse(
        { success: false, error: 'Erro interno do servidor' },
        500
      );
    }

    // Log successful password change
    await logSecurityEvent({
      type: 'admin_action',
      user_id: authResult.user!.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        action: 'password_changed',
        success: true
      }
    });

    return createSecureResponse({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Error in PATCH /api/user/password:', error);

    await logSecurityEvent({
      type: 'system_error',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        endpoint: '/api/user/password',
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

export async function GET(): Promise<NextResponse> {
  return createSecureResponse(
    { success: false, error: 'Method not allowed' },
    405
  );
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