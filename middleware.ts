/**
 * Next.js middleware for route protection with Supabase Auth
 * Protects /admin routes and adds security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase-auth';
import { addSecurityHeaders, enforceHttps } from '@/lib/auth/security-config';

// Protected route patterns
const PROTECTED_ROUTES = ['/admin'];
const LOGIN_PATH = '/login';
const ADMIN_PATH = '/admin';

// CSRF token header name
const CSRF_HEADER = 'x-csrf-token';

/**
 * Check if the request path matches protected routes
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

// Note: addSecurityHeaders is now imported from security-config.ts

/**
 * Create redirect response to login page
 */
function createLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  
  // Add return URL for post-login redirect
  if (request.nextUrl.pathname !== LOGIN_PATH) {
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
  }
  
  const response = NextResponse.redirect(loginUrl);
  return addSecurityHeaders(response);
}

/**
 * Create redirect response to admin panel
 */
function createAdminRedirect(request: NextRequest): NextResponse {
  const adminUrl = new URL(ADMIN_PATH, request.url);
  const response = NextResponse.redirect(adminUrl);
  return addSecurityHeaders(response);
}

/**
 * Validate CSRF token for state-changing requests
 */
function validateCSRF(request: NextRequest): boolean {
  // Only validate CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return true;
  }
  
  // Skip CSRF validation for API routes (they should handle it internally)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return true;
  }
  
  const csrfToken = request.headers.get(CSRF_HEADER);
  const csrfCookie = request.cookies.get('csrf-token')?.value;
  
  // For now, we'll implement basic CSRF validation
  // In a full implementation, this would use cryptographic tokens
  return csrfToken === csrfCookie;
}

/**
 * Log security events for monitoring (simplified for now)
 */
async function logSecurityEvent(
  type: string,
  request: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  // Simplified logging for now - just console log
  console.log(`[SECURITY] ${type}:`, {
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    path: request.nextUrl.pathname,
    ...details
  });
}

/**
 * Main middleware function with Supabase Auth
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  try {
    // Enforce HTTPS in production
    const httpsRedirect = enforceHttps(request);
    if (httpsRedirect) {
      return httpsRedirect;
    }

    // Create Supabase client for middleware
    const { supabase, response } = createMiddlewareClient(request);
    
    // Get user session
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Handle login page access for authenticated users
    if (pathname === LOGIN_PATH) {
      if (user && !error) {
        await logSecurityEvent('authenticated_login_access', request, {
          user_id: user.id
        });
        
        // Redirect authenticated users away from login page
        return createAdminRedirect(request);
      }
      
      // Allow access to login page for unauthenticated users
      return addSecurityHeaders(NextResponse.next());
    }
    
    // Handle protected routes
    if (isProtectedRoute(pathname)) {
      if (!user || error) {
        await logSecurityEvent('unauthorized_access_attempt', request, {
          reason: error ? 'auth_error' : 'no_user'
        });
        
        return createLoginRedirect(request);
      }
      
      // Validate CSRF for state-changing requests
      if (!validateCSRF(request)) {
        await logSecurityEvent('csrf_validation_failed', request, {
          user_id: user.id,
          method: request.method
        });
        
        return new NextResponse('CSRF validation failed', { status: 403 });
      }
      
      // Log successful access
      await logSecurityEvent('authorized_access', request, {
        user_id: user.id,
        username: user.email
      });
      
      // Add user info to request headers for downstream use
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-user-email', user.email || '');
      response.headers.set('x-user-role', user.user_metadata?.role || 'user');
      
      return addSecurityHeaders(response);
    }
    
    // For all other routes, just add security headers
    return addSecurityHeaders(response);
    
  } catch (error) {
    // Log middleware errors
    await logSecurityEvent('middleware_error', request, {
      error: error instanceof Error ? error.message : 'unknown_error'
    });
    
    // On error, redirect to login for protected routes, otherwise continue
    if (isProtectedRoute(pathname)) {
      return createLoginRedirect(request);
    }
    
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }
}

/**
 * Middleware configuration
 * Define which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};