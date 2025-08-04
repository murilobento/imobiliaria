#!/usr/bin/env node

/**
 * Initial Admin User Setup Script
 * 
 * This script creates the initial admin user and validates the authentication configuration.
 * It should be run after database migrations and before starting the application.
 * 
 * Usage:
 *   node scripts/setup-initial-admin.js
 *   npm run setup:admin
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function loadAuthModule() {
  try {
    // Register ts-node to handle TypeScript files
    require('ts-node').register({
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true
      }
    });
    
    // Use dynamic import for TypeScript modules
    const { initializeAuthDatabase, validateAuthDatabaseConfig, validateEnvironmentConfig } = await import('../src/lib/auth/database-setup.ts');
    return { initializeAuthDatabase, validateAuthDatabaseConfig, validateEnvironmentConfig };
  } catch (error) {
    console.error('❌ Failed to load authentication modules:', error.message);
    console.error('Make sure ts-node is installed: npm install --save-dev ts-node');
    process.exit(1);
  }
}

async function validatePrerequisites() {
  console.log('🔍 Validating prerequisites...');

  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    console.error('❌ .env.local file not found');
    console.error('Please copy .env.local.example to .env.local and configure it');
    return false;
  }

  // Check if required environment variables are set
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    return false;
  }

  console.log('✅ Prerequisites validated');
  return true;
}

async function main() {
  console.log('🔐 Initial Admin User Setup');
  console.log('============================\n');

  try {
    // Validate prerequisites
    const prerequisitesValid = await validatePrerequisites();
    if (!prerequisitesValid) {
      process.exit(1);
    }

    // Load authentication modules
    const { initializeAuthDatabase, validateAuthDatabaseConfig, validateEnvironmentConfig } = await loadAuthModule();

    // Validate environment configuration
    console.log('1. Validating environment configuration...');
    const envConfigValid = await validateEnvironmentConfig();
    if (!envConfigValid) {
      console.error('❌ Environment configuration validation failed');
      process.exit(1);
    }

    // Validate database configuration
    console.log('\n2. Validating database configuration...');
    const dbConfigValid = await validateAuthDatabaseConfig();
    if (!dbConfigValid) {
      console.error('❌ Database configuration validation failed');
      console.error('\nPlease ensure:');
      console.error('- Supabase is properly configured');
      console.error('- Auth tables are created (run migrations first)');
      console.error('- Service role key is set in environment variables');
      process.exit(1);
    }

    // Initialize authentication database
    console.log('\n3. Setting up initial admin user...');
    const initSuccess = await initializeAuthDatabase();

    if (!initSuccess) {
      console.error('❌ Failed to setup initial admin user');
      process.exit(1);
    }

    console.log('\n✅ Initial admin user setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Navigate to http://localhost:3000/login');
    console.log('3. Use the generated admin credentials to log in');
    console.log('4. ⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nFor troubleshooting:');
    console.error('1. Ensure all environment variables are properly set');
    console.error('2. Verify database migrations have been run');
    console.error('3. Check Supabase connection and permissions');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the setup
main();