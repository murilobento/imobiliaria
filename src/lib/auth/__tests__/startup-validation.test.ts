/**
 * Tests for startup security validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    validateStartupSecurity,
    validateEnvironmentVariables,
    checkSecureContext,
    generateSecurityReport,
    logSecurityReport
} from '../startup-validation';

// Mock environment variables
const originalExit = process.exit;

describe('Startup Validation', () => {
    beforeEach(() => {
        vi.resetModules();
        process.exit = vi.fn() as any;
        // Mock NODE_ENV using vi.stubEnv
        vi.stubEnv('NODE_ENV', 'test');
    });

    afterEach(() => {
        process.exit = originalExit;
        vi.unstubAllEnvs();
    });

    describe('validateEnvironmentVariables', () => {
        it('should pass validation with all required variables', () => {
            vi.stubEnv('JWT_SECRET', 'test-jwt-secret');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const result = validateEnvironmentVariables();

            expect(result.valid).toBe(true);
            expect(result.missing).toHaveLength(0);
            expect(result.invalid).toHaveLength(0);
        });

        it('should detect missing environment variables', () => {
            vi.stubEnv('JWT_SECRET', undefined);
            vi.stubEnv('CSRF_SECRET', undefined);

            const result = validateEnvironmentVariables();

            expect(result.valid).toBe(false);
            expect(result.missing).toContain('JWT_SECRET');
            expect(result.missing).toContain('CSRF_SECRET');
        });

        it('should detect default JWT_SECRET value', () => {
            vi.stubEnv('JWT_SECRET', 'your-super-secret-jwt-key-here-change-in-production');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const result = validateEnvironmentVariables();

            expect(result.valid).toBe(false);
            expect(result.invalid).toContain('JWT_SECRET (using default value)');
        });

        it('should detect default CSRF_SECRET value', () => {
            vi.stubEnv('JWT_SECRET', 'test-jwt-secret');
            vi.stubEnv('CSRF_SECRET', 'your-csrf-secret-here-change-in-production');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const result = validateEnvironmentVariables();

            expect(result.valid).toBe(false);
            expect(result.invalid).toContain('CSRF_SECRET (using default value)');
        });
    });

    describe('checkSecureContext', () => {
        it('should pass in secure production configuration', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('HSTS_MAX_AGE', '31536000');

            const result = checkSecureContext();

            expect(result.isSecure).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should detect disabled HTTPS enforcement in production', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('DISABLE_HTTPS_ENFORCEMENT', 'true');

            const result = checkSecureContext();

            expect(result.isSecure).toBe(false);
            expect(result.issues).toContain('HTTPS enforcement is disabled in production');
        });

        it('should detect disabled CSP', () => {
            vi.stubEnv('DISABLE_CSP', 'true');

            const result = checkSecureContext();

            expect(result.isSecure).toBe(false);
            expect(result.issues).toContain('Content Security Policy is disabled');
        });

        it('should detect low HSTS max-age in production', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('HSTS_MAX_AGE', '3600'); // 1 hour

            const result = checkSecureContext();

            expect(result.isSecure).toBe(false);
            expect(result.issues).toContain('HSTS max-age is less than recommended minimum (86400 seconds)');
        });

        it('should not check HSTS in development', () => {
            vi.stubEnv('NODE_ENV', 'development');
            vi.stubEnv('HSTS_MAX_AGE', '3600');

            const result = checkSecureContext();

            expect(result.isSecure).toBe(true);
            expect(result.issues).toHaveLength(0);
        });
    });

    describe('generateSecurityReport', () => {
        it('should generate comprehensive security report', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('JWT_SECRET', 'test-jwt-secret-long-enough-for-production');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const report = generateSecurityReport();

            expect(report.timestamp).toBeTruthy();
            expect(report.environment).toBe('production');
            expect(report.validation).toBeTruthy();
            expect(report.environmentVariables).toBeTruthy();
            expect(report.secureContext).toBeTruthy();
        });

        it('should include validation results in report', () => {
            vi.stubEnv('JWT_SECRET', 'test-jwt-secret-long-enough-for-production');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const report = generateSecurityReport();

            expect(report.validation.valid).toBe(true);
            expect(report.environmentVariables.valid).toBe(true);
            expect(report.secureContext.isSecure).toBe(true);
        });
    });

    describe('validateStartupSecurity', () => {
        it('should log success message for valid configuration', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            vi.stubEnv('JWT_SECRET', 'test-jwt-secret-long-enough-for-production');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            validateStartupSecurity();

            expect(consoleSpy).toHaveBeenCalledWith('🔍 Validating security configuration...');
            expect(consoleSpy).toHaveBeenCalledWith('\n✅ Security validation passed successfully!');

            consoleSpy.mockRestore();
        });

        it('should exit in production with security errors', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('JWT_SECRET', undefined);

            validateStartupSecurity();

            expect(process.exit).toHaveBeenCalledWith(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Security validation failed!');

            consoleErrorSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('should warn but not exit in development with security errors', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            vi.stubEnv('NODE_ENV', 'development');
            vi.stubEnv('JWT_SECRET', undefined);

            validateStartupSecurity();

            expect(process.exit).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith('\n⚠️  Application starting in development mode with security errors.');

            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('should log warnings when present', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('JWT_SECRET', 'test-jwt-secret-long-enough-for-production');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
            vi.stubEnv('DISABLE_HTTPS_ENFORCEMENT', 'true');

            validateStartupSecurity();

            expect(consoleWarnSpy).toHaveBeenCalledWith('\n⚠️  Security warnings detected:');
            expect(consoleWarnSpy).toHaveBeenCalledWith('Consider resolving these warnings for optimal security.');

            consoleWarnSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });
    });

    describe('logSecurityReport', () => {
        it('should log comprehensive security report', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            vi.stubEnv('JWT_SECRET', 'test-jwt-secret-long-enough-for-production');
            vi.stubEnv('CSRF_SECRET', 'test-csrf-secret');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            logSecurityReport();

            expect(consoleSpy).toHaveBeenCalledWith('\n📊 Security Configuration Report');
            expect(consoleSpy).toHaveBeenCalledWith('================================');
            expect(consoleSpy).toHaveBeenCalledWith('🔒 Overall Security Status: SECURE ✅');

            consoleSpy.mockRestore();
        });

        it('should show security issues in report', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            vi.stubEnv('JWT_SECRET', undefined);

            logSecurityReport();

            expect(consoleSpy).toHaveBeenCalledWith('🔓 Overall Security Status: NEEDS ATTENTION ⚠️');
            expect(consoleSpy).toHaveBeenCalledWith('  ❌ Missing variables:');

            consoleSpy.mockRestore();
        });
    });
});