#!/usr/bin/env node

/**
 * Security validation script
 * Validates the security configuration and reports any issues
 */

// Import the validation functions
const { validateStartupSecurity, logSecurityReport } = require('../src/lib/auth/startup-validation.ts');

console.log('🔒 Security Configuration Validation');
console.log('====================================\n');

try {
  // Run startup validation
  validateStartupSecurity();
  
  console.log('\n📊 Detailed Security Report:');
  console.log('============================');
  
  // Generate detailed report
  logSecurityReport();
  
} catch (error) {
  console.error('❌ Error during security validation:', error.message);
  process.exit(1);
}