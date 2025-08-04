#!/usr/bin/env node

/**
 * Authentication Database Setup Script
 * 
 * This script initializes the authentication database by:
 * 1. Validating database configuration
 * 2. Creating default admin user if it doesn't exist
 * 3. Running any necessary setup operations
 */

const { initializeAuthDatabase, validateAuthDatabaseConfig } = require('../src/lib/auth/database-setup.ts');

async function main() {
  console.log('🔐 Authentication Database Setup');
  console.log('================================\n');
  
  try {
    // Validate database configuration
    console.log('1. Validating database configuration...');
    const isConfigValid = await validateAuthDatabaseConfig();
    
    if (!isConfigValid) {
      console.error('❌ Database configuration validation failed');
      console.error('Please ensure:');
      console.error('- Supabase is properly configured');
      console.error('- Auth tables are created (run migrations first)');
      console.error('- Service role key is set in environment variables');
      process.exit(1);
    }
    
    // Initialize authentication database
    console.log('\n2. Initializing authentication database...');
    const initSuccess = await initializeAuthDatabase();
    
    if (!initSuccess) {
      console.error('❌ Failed to initialize authentication database');
      process.exit(1);
    }
    
    console.log('\n✅ Authentication database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the application: npm run dev');
    console.log('2. Navigate to /login');
    console.log('3. Use the generated admin credentials to log in');
    console.log('4. Change the default password after first login');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the setup
main();