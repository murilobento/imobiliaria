/**
 * Application startup validation for security configuration
 * Validates environment variables and security settings on application start
 */

import { validateSecurityConfig, logSecurityConfigStatus } from './security-config';

/**
 * Validate all security requirements on application startup
 * This should be called early in the application lifecycle
 */
export function validateStartupSecurity(): void {
  console.log('🔍 Validating security configuration...');
  
  const validation = validateSecurityConfig();
  
  // Log the current security status
  logSecurityConfigStatus();
  
  // Handle validation errors
  if (!validation.valid) {
    console.error('\n❌ Security validation failed!');
    console.error('The following errors must be resolved before starting the application:');
    validation.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      console.error('\n🚨 Application cannot start in production with security errors.');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Application starting in development mode with security errors.');
      console.warn('Please resolve these issues before deploying to production.');
    }
  }
  
  // Handle validation warnings
  if (validation.warnings.length > 0) {
    console.warn('\n⚠️  Security warnings detected:');
    validation.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      console.warn('Consider resolving these warnings for optimal security.');
    }
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('\n✅ Security validation passed successfully!');
  }
  
  console.log(''); // Empty line for better readability
}

/**
 * Validate specific environment variables required for security
 */
export function validateEnvironmentVariables(): {
  valid: boolean;
  missing: string[];
  invalid: string[];
} {
  const required = [
    'JWT_SECRET',
    'CSRF_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missing: string[] = [];
  const invalid: string[] = [];
  
  // Check required variables
  for (const variable of required) {
    const value = process.env[variable];
    if (!value) {
      missing.push(variable);
    } else {
      // Check for default/placeholder values
      if (variable === 'JWT_SECRET' && value === 'your-super-secret-jwt-key-here-change-in-production') {
        invalid.push(`${variable} (using default value)`);
      }
      if (variable === 'CSRF_SECRET' && value === 'your-csrf-secret-here-change-in-production') {
        invalid.push(`${variable} (using default value)`);
      }
    }
  }
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
}

/**
 * Check if the application is running in a secure context
 */
export function checkSecureContext(): {
  isSecure: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check HTTPS enforcement
  if (isProduction && process.env.DISABLE_HTTPS_ENFORCEMENT === 'true') {
    issues.push('HTTPS enforcement is disabled in production');
  }
  
  // Check CSP
  if (process.env.DISABLE_CSP === 'true') {
    issues.push('Content Security Policy is disabled');
  }
  
  // Check HSTS settings
  if (isProduction) {
    const hstsMaxAge = parseInt(process.env.HSTS_MAX_AGE || '31536000');
    if (hstsMaxAge < 86400) {
      issues.push('HSTS max-age is less than recommended minimum (86400 seconds)');
    }
  }
  
  return {
    isSecure: issues.length === 0,
    issues
  };
}

/**
 * Generate a security report for the current configuration
 */
export function generateSecurityReport(): {
  timestamp: string;
  environment: string;
  validation: ReturnType<typeof validateSecurityConfig>;
  environmentVariables: ReturnType<typeof validateEnvironmentVariables>;
  secureContext: ReturnType<typeof checkSecureContext>;
} {
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    validation: validateSecurityConfig(),
    environmentVariables: validateEnvironmentVariables(),
    secureContext: checkSecureContext()
  };
}

/**
 * Log a comprehensive security report
 */
export function logSecurityReport(): void {
  const report = generateSecurityReport();
  
  console.log('\n📊 Security Configuration Report');
  console.log('================================');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Environment: ${report.environment}`);
  console.log('');
  
  // Environment Variables
  console.log('Environment Variables:');
  if (report.environmentVariables.valid) {
    console.log('  ✅ All required variables present');
  } else {
    if (report.environmentVariables.missing.length > 0) {
      console.log('  ❌ Missing variables:');
      report.environmentVariables.missing.forEach(v => console.log(`     - ${v}`));
    }
    if (report.environmentVariables.invalid.length > 0) {
      console.log('  ⚠️  Invalid variables:');
      report.environmentVariables.invalid.forEach(v => console.log(`     - ${v}`));
    }
  }
  console.log('');
  
  // Secure Context
  console.log('Secure Context:');
  if (report.secureContext.isSecure) {
    console.log('  ✅ Secure context validated');
  } else {
    console.log('  ⚠️  Security issues detected:');
    report.secureContext.issues.forEach(issue => console.log(`     - ${issue}`));
  }
  console.log('');
  
  // Overall Status
  const overallSecure = report.validation.valid && 
                       report.environmentVariables.valid && 
                       report.secureContext.isSecure;
  
  if (overallSecure) {
    console.log('🔒 Overall Security Status: SECURE ✅');
  } else {
    console.log('🔓 Overall Security Status: NEEDS ATTENTION ⚠️');
  }
  
  console.log('================================\n');
}