/**
 * Supabase Authentication Utilities for API Routes
 * Funções para autenticar usuários usando Supabase Auth em API routes
 */

import { NextRequest } from 'next/server';
import { createServerClientForAPI } from '@/lib/supabase-auth';

interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
  status?: number;
}

/**
 * Authenticate user using Supabase Auth
 */
export async function authenticateSupabaseUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Check for Authorization header first
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    const supabase = createServerClientForAPI(request);
    

    
    // If we have an access token from the Authorization header, use it
    let user, error;
    if (accessToken) {
      const result = await supabase.auth.getUser(accessToken);
      user = result.data.user;
      error = result.error;
    } else {
      // Fall back to cookie-based authentication
      const result = await supabase.auth.getUser();
      user = result.data.user;
      error = result.error;
    }



    if (error || !user) {
      return {
        success: false,
        error: error?.message || 'No authentication token provided',
        status: 401
      };
    }

    // Get user role from metadata (default to 'real-estate-agent' if not set)
    const role = user.user_metadata?.role || 'real-estate-agent';



    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: role
      }
    };

  } catch (error) {
    console.error('Error authenticating Supabase user:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 401
    };
  }
}

/**
 * Authenticate and authorize admin user using Supabase Auth
 */
export async function authenticateSupabaseAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateSupabaseUser(request);
  
  if (!authResult.success) {
    return authResult;
  }

  // Check if user has admin role
  if (authResult.user!.role !== 'admin') {
    return {
      success: false,
      error: 'Insufficient permissions',
      status: 403
    };
  }

  return authResult;
}