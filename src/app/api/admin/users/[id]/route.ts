/**
 * Admin User Management API - Individual User Operations
 * Handles individual user operations like status updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseAdmin } from '@/lib/auth/supabase-auth-utils';
import { updateSupabaseUserStatus, updateSupabaseUser, type SupabaseUser } from '@/lib/auth/supabase-admin';
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
 * PATCH /api/admin/users/[id]
 * Update user status (activate/deactivate)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const { id: userId } = await context.params;

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
          endpoint: `/api/admin/users/${userId}`,
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

    // Validate fields
    if (sanitizedData.is_active !== undefined && typeof sanitizedData.is_active !== 'boolean') {
      return createSecureResponse(
        { success: false, error: 'is_active field must be boolean' },
        400
      );
    }

    if (sanitizedData.role !== undefined && !['admin', 'real-estate-agent'].includes(sanitizedData.role)) {
      return createSecureResponse(
        { success: false, error: 'Invalid role. Must be admin or real-estate-agent' },
        400
      );
    }

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
    const hasUpdates = sanitizedData.is_active !== undefined || 
                      sanitizedData.role !== undefined ||
                      sanitizedData.fullName !== undefined ||
                      sanitizedData.username !== undefined ||
                      sanitizedData.email !== undefined;

    if (!hasUpdates) {
      return createSecureResponse(
        { success: false, error: 'Pelo menos um campo deve ser fornecido para atualização' },
        400
      );
    }

    // Prevent admin from deactivating themselves
    if (userId === authResult.user!.id && !sanitizedData.is_active) {
      return createSecureResponse(
        { success: false, error: 'You cannot deactivate your own account' },
        400
      );
    }

    // Update user in Supabase
    const updatedUser = await updateSupabaseUser(userId, {
      isActive: sanitizedData.is_active,
      role: sanitizedData.role,
      fullName: sanitizedData.fullName,
      username: sanitizedData.username,
      email: sanitizedData.email
    });

    // Log successful user status change
    await logSecurityEvent({
      type: 'admin_action',
      user_id: authResult.user!.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        action: 'update_user_status',
        target_user_id: userId,
        new_status: sanitizedData.is_active ? 'active' : 'inactive'
      }
    });

    return createSecureResponse({
      success: true,
      data: updatedUser,
      message: `User ${sanitizedData.is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error in PATCH /api/admin/users/[id]:', error);

    await logSecurityEvent({
      type: 'system_error',
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date(),
      details: {
        endpoint: `/api/admin/users/${userId}`,
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
 * Handle unsupported HTTP methods
 */
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