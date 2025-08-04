# Production Security Guide

This document outlines the production security features implemented in the authentication system and how to configure them properly.

## Overview

The application implements comprehensive security measures that are automatically configured based on the environment. Production environments receive enhanced security settings while development environments are configured for ease of development.

## Security Features

### 1. HTTPS Enforcement

**Production Behavior:**
- Automatically redirects all HTTP requests to HTTPS
- Returns 301 permanent redirects to maintain SEO
- Adds security headers to redirect responses

**Configuration:**
```bash
# Disable HTTPS enforcement (not recommended in production)
DISABLE_HTTPS_ENFORCEMENT=true
```

**Detection Methods:**
- Request protocol (`https:`)
- `x-forwarded-proto` header (for reverse proxies)
- `x-forwarded-ssl` header

### 2. Security Headers

The application automatically adds comprehensive security headers to all responses:

#### Basic Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `X-DNS-Prefetch-Control: off` - Disables DNS prefetching
- `X-Download-Options: noopen` - Prevents file execution
- `X-Permitted-Cross-Domain-Policies: none` - Blocks cross-domain policies

#### Server Information
- Removes `Server` and `X-Powered-By` headers to hide server information

### 3. HTTP Strict Transport Security (HSTS)

**Production Only:**
- Enforces HTTPS for all future requests
- Includes subdomains by default
- Enables HSTS preloading

**Default Configuration:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Environment Variables:**
```bash
HSTS_MAX_AGE=31536000          # 1 year (default)
HSTS_INCLUDE_SUBDOMAINS=true   # Include subdomains (default)
```

### 4. Content Security Policy (CSP)

Comprehensive CSP configuration that adapts to environment:

#### Production CSP
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' [SUPABASE_URL];
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

#### Development CSP
- Includes `'unsafe-eval'` for development tools
- More permissive for hot reloading

**Configuration:**
```bash
# Disable CSP (not recommended)
DISABLE_CSP=true
```

### 5. Secure Cookies

Cookie security settings adapt to environment:

#### Production Cookies
- `Secure` flag (HTTPS only)
- `HttpOnly` flag (no JavaScript access)
- `SameSite=Strict` (CSRF protection)

#### Development Cookies
- No `Secure` flag (allows HTTP)
- `HttpOnly` flag maintained
- `SameSite=Lax` (less restrictive for development)

## Configuration Validation

### Startup Validation

The application validates security configuration on startup:

```bash
npm run validate:security
```

**Validation Checks:**
- Required environment variables
- Secret key strength and uniqueness
- Production-specific security settings
- HSTS configuration
- CSP settings

### Environment Variables

#### Required Variables
```bash
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
CSRF_SECRET=your-csrf-secret-here-change-in-production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Security Configuration
```bash
# Production Security Settings
DISABLE_HTTPS_ENFORCEMENT=false
DISABLE_CSP=false
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true

# Authentication Settings
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=1h

# Rate Limiting
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000
ACCOUNT_LOCK_DURATION_MS=1800000
```

## Production Deployment Checklist

### Before Deployment

1. **Update Default Secrets**
   ```bash
   # Generate strong secrets (32+ characters)
   JWT_SECRET=$(openssl rand -base64 32)
   CSRF_SECRET=$(openssl rand -base64 32)
   ```

2. **Validate Configuration**
   ```bash
   NODE_ENV=production npm run validate:security
   ```

3. **Test Security Headers**
   ```bash
   curl -I https://your-domain.com
   ```

### Security Validation Errors

The application will **exit with error code 1** in production if:
- `JWT_SECRET` is missing or uses default value
- `CSRF_SECRET` is missing or uses default value
- `JWT_SECRET` is less than 32 characters
- Required Supabase configuration is missing

### Security Warnings

The application will **log warnings** for:
- HTTPS enforcement disabled in production
- CSP disabled
- HSTS max-age less than 1 day
- Short JWT secrets in development

## Testing Security Features

### Unit Tests
```bash
npm test src/lib/auth/__tests__/security-config.test.ts
npm test src/lib/auth/__tests__/startup-validation.test.ts
```

### Integration Tests
```bash
npm test src/test/integration/production-security.test.tsx
```

### Manual Testing

1. **HTTPS Enforcement**
   ```bash
   curl -I http://your-domain.com
   # Should return 301 redirect to https://
   ```

2. **Security Headers**
   ```bash
   curl -I https://your-domain.com
   # Check for security headers in response
   ```

3. **CSP Validation**
   - Use browser developer tools
   - Check for CSP violations in console

## Security Monitoring

### Security Event Logging

The application logs security events including:
- HTTPS enforcement redirects
- Security header additions
- Configuration validation results
- Startup security status

### Log Examples

```
🔒 Security Configuration Status:
   Environment: production
   HTTPS Enforcement: ✅
   HSTS Enabled: ✅
   CSP Enabled: ✅
   Secure Cookies: ✅
✅ Security configuration is valid
```

## Troubleshooting

### Common Issues

1. **Mixed Content Warnings**
   - Ensure all resources use HTTPS
   - Check CSP connect-src includes all required domains

2. **Cookie Issues**
   - Verify domain configuration
   - Check SameSite compatibility

3. **CSP Violations**
   - Review inline scripts and styles
   - Add necessary domains to CSP directives

### Debug Mode

Set environment variable for detailed security logging:
```bash
DEBUG_SECURITY=true
```

## Best Practices

1. **Regular Security Audits**
   - Run `npm run validate:security` regularly
   - Monitor security headers with online tools

2. **Secret Rotation**
   - Rotate JWT and CSRF secrets periodically
   - Use environment-specific secrets

3. **CSP Monitoring**
   - Monitor CSP violation reports
   - Gradually tighten CSP policies

4. **HSTS Preloading**
   - Submit domain to HSTS preload list
   - Test with longer max-age values first

## Additional Resources

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Preload List](https://hstspreload.org/)
- [Security Headers Analyzer](https://securityheaders.com/)