/**
 * Production security configuration and utilities
 * Handles HTTPS enforcement, security headers, CSP, and environment-specific settings
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  enforceHttps: boolean;
  enableHSTS: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  enableCSP: boolean;
  cspDirectives: Record<string, string[]>;
  secureCookies: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  enableSecurityHeaders: boolean;
}

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    enforceHttps: isProduction && process.env.DISABLE_HTTPS_ENFORCEMENT !== 'true',
    enableHSTS: isProduction,
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'), // 1 year default
    hstsIncludeSubdomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
    enableCSP: process.env.DISABLE_CSP !== 'true',
    cspDirectives: {
      'default-src': ["'self'"],
      'script-src': isDevelopment 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] 
        : ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", process.env.NEXT_PUBLIC_SUPABASE_URL || ''].filter(Boolean),
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'child-src': ["'self'"],
      'frame-src': ["'none'"],
      'manifest-src': ["'self'"]
    },
    secureCookies: isProduction,
    cookieSameSite: isProduction ? 'strict' : 'lax',
    enableSecurityHeaders: true
  };
}

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Add comprehensive security headers to response
 */
export function addSecurityHeaders(response: NextResponse, config?: SecurityConfig): NextResponse {
  const securityConfig = config || getSecurityConfig();
  
  if (!securityConfig.enableSecurityHeaders) {
    return response;
  }
  
  // Basic security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Content Security Policy
  if (securityConfig.enableCSP) {
    const cspHeader = generateCSPHeader(securityConfig.cspDirectives);
    response.headers.set('Content-Security-Policy', cspHeader);
  }
  
  // HTTPS enforcement headers
  if (securityConfig.enableHSTS) {
    const hstsValue = [
      `max-age=${securityConfig.hstsMaxAge}`,
      securityConfig.hstsIncludeSubdomains ? 'includeSubDomains' : '',
      'preload'
    ].filter(Boolean).join('; ');
    
    response.headers.set('Strict-Transport-Security', hstsValue);
  }
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

/**
 * Check if request is using HTTPS
 */
export function isHttpsRequest(request: NextRequest): boolean {
  // Check protocol from request
  if (request.nextUrl.protocol === 'https:') {
    return true;
  }
  
  // Check forwarded protocol headers (for reverse proxies)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto === 'https') {
    return true;
  }
  
  // Check other common headers
  const forwardedSsl = request.headers.get('x-forwarded-ssl');
  if (forwardedSsl === 'on') {
    return true;
  }
  
  return false;
}

/**
 * Enforce HTTPS by redirecting HTTP requests
 */
export function enforceHttps(request: NextRequest, config?: SecurityConfig): NextResponse | null {
  const securityConfig = config || getSecurityConfig();
  
  if (!securityConfig.enforceHttps) {
    return null;
  }
  
  if (!isHttpsRequest(request)) {
    // Create HTTPS URL
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    
    // Redirect to HTTPS
    const response = NextResponse.redirect(httpsUrl, 301);
    return addSecurityHeaders(response, securityConfig);
  }
  
  return null;
}

/**
 * Create secure cookie options based on configuration
 */
export function getSecureCookieOptions(config?: SecurityConfig): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
} {
  const securityConfig = config || getSecurityConfig();
  
  return {
    httpOnly: true,
    secure: securityConfig.secureCookies,
    sameSite: securityConfig.cookieSameSite,
    path: '/'
  };
}

/**
 * Validate security configuration on startup
 */
export function validateSecurityConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret.length < 32) {
    if (isProduction) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    } else {
      warnings.push('JWT_SECRET should be at least 32 characters');
    }
  } else if (jwtSecret === 'your-super-secret-jwt-key-here-change-in-production') {
    if (isProduction) {
      errors.push('JWT_SECRET must be changed from default value in production');
    } else {
      warnings.push('JWT_SECRET should be changed from default value');
    }
  }
  
  // Check CSRF secret
  const csrfSecret = process.env.CSRF_SECRET;
  if (!csrfSecret) {
    errors.push('CSRF_SECRET environment variable is required');
  } else if (csrfSecret === 'your-csrf-secret-here-change-in-production') {
    if (isProduction) {
      errors.push('CSRF_SECRET must be changed from default value in production');
    } else {
      warnings.push('CSRF_SECRET should be changed from default value');
    }
  }
  
  // Check Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
  }
  
  // Production-specific checks
  if (isProduction) {
    // Check HTTPS enforcement
    if (process.env.DISABLE_HTTPS_ENFORCEMENT === 'true') {
      warnings.push('HTTPS enforcement is disabled in production');
    }
    
    // Check CSP
    if (process.env.DISABLE_CSP === 'true') {
      warnings.push('Content Security Policy is disabled in production');
    }
    
    // Check HSTS configuration
    const hstsMaxAge = parseInt(process.env.HSTS_MAX_AGE || '31536000');
    if (hstsMaxAge < 86400) { // Less than 1 day
      warnings.push('HSTS max-age should be at least 86400 seconds (1 day) in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log security configuration status
 */
export function logSecurityConfigStatus(): void {
  const validation = validateSecurityConfig();
  const config = getSecurityConfig();
  
  console.log('🔒 Security Configuration Status:');
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   HTTPS Enforcement: ${config.enforceHttps ? '✅' : '❌'}`);
  console.log(`   HSTS Enabled: ${config.enableHSTS ? '✅' : '❌'}`);
  console.log(`   CSP Enabled: ${config.enableCSP ? '✅' : '❌'}`);
  console.log(`   Secure Cookies: ${config.secureCookies ? '✅' : '❌'}`);
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Security Warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  if (validation.errors.length > 0) {
    console.error('❌ Security Errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('✅ Security configuration is valid');
  }
}