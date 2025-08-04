#!/usr/bin/env tsx

/**
 * Initial Admin User Setup Script (TypeScript version)
 * 
 * This script creates the initial admin user and validates the authentication configuration.
 * It should be run after database migrations and before starting the application.
 * 
 * Usage:
 *   npx tsx scripts/setup-initial-admin.ts
 */

import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { initializeAuthDatabase, validateAuthDatabaseConfig, validateEnvironmentConfig } from '../src/lib/auth/database-setup';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function validatePrerequisites(): Promise<boolean> {
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
    console.error('❌ Setup failed:', error);
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