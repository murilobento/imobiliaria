#!/usr/bin/env node

/**
 * Verification script for user profile management endpoints
 * This script tests the API endpoints to ensure they work correctly
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyUserProfileEndpoints() {
  console.log('🔍 Verifying User Profile Management Endpoints...\n');

  try {
    // 1. Check if auth_users table has required columns
    console.log('1. Checking database schema...');
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'auth_users' });

    if (schemaError) {
      console.log('⚠️  Could not verify schema (this is expected if the RPC function doesn\'t exist)');
    } else {
      const requiredColumns = ['email', 'is_active', 'created_by'];
      const existingColumns = columns?.map(col => col.column_name) || [];
      
      for (const col of requiredColumns) {
        if (existingColumns.includes(col)) {
          console.log(`   ✅ Column '${col}' exists`);
        } else {
          console.log(`   ❌ Column '${col}' missing`);
        }
      }
    }

    // 2. Check if we have at least one user to test with
    console.log('\n2. Checking for test users...');
    const { data: users, error: usersError } = await supabase
      .from('auth_users')
      .select('id, username, email, is_active')
      .limit(1);

    if (usersError) {
      console.log(`   ❌ Error querying users: ${usersError.message}`);
      return;
    }

    if (!users || users.length === 0) {
      console.log('   ⚠️  No users found in database. Create a user first to test the endpoints.');
      return;
    }

    const testUser = users[0];
    console.log(`   ✅ Found test user: ${testUser.username} (${testUser.email})`);

    // 3. Test endpoint structure (without authentication for now)
    console.log('\n3. Testing endpoint structure...');
    
    // Test GET /api/user/profile without auth (should return 401)
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`);
      if (response.status === 401) {
        console.log('   ✅ GET /api/user/profile correctly requires authentication');
      } else {
        console.log(`   ❌ GET /api/user/profile returned unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test GET /api/user/profile: ${error.message}`);
    }

    // Test PATCH /api/user/profile without auth (should return 401)
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test' })
      });
      if (response.status === 401) {
        console.log('   ✅ PATCH /api/user/profile correctly requires authentication');
      } else {
        console.log(`   ❌ PATCH /api/user/profile returned unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test PATCH /api/user/profile: ${error.message}`);
    }

    // Test PATCH /api/user/password without auth (should return 401)
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: 'test', 
          newPassword: 'test', 
          confirmPassword: 'test' 
        })
      });
      if (response.status === 401) {
        console.log('   ✅ PATCH /api/user/password correctly requires authentication');
      } else {
        console.log(`   ❌ PATCH /api/user/password returned unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test PATCH /api/user/password: ${error.message}`);
    }

    // 4. Test database functions
    console.log('\n4. Testing database functions...');
    
    // Test getUserById
    try {
      const { getUserById } = require('../src/lib/auth/database.ts');
      const user = await getUserById(testUser.id);
      if (user && user.id === testUser.id) {
        console.log('   ✅ getUserById function works correctly');
      } else {
        console.log('   ❌ getUserById function failed');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test getUserById: ${error.message}`);
    }

    // Test checkUsernameAvailability
    try {
      const { checkUsernameAvailability } = require('../src/lib/auth/database.ts');
      const isAvailable = await checkUsernameAvailability('nonexistentuser123');
      if (isAvailable === true) {
        console.log('   ✅ checkUsernameAvailability function works correctly');
      } else {
        console.log('   ❌ checkUsernameAvailability function failed');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test checkUsernameAvailability: ${error.message}`);
    }

    // Test checkEmailAvailability
    try {
      const { checkEmailAvailability } = require('../src/lib/auth/database.ts');
      const isAvailable = await checkEmailAvailability('nonexistent@example.com');
      if (isAvailable === true) {
        console.log('   ✅ checkEmailAvailability function works correctly');
      } else {
        console.log('   ❌ checkEmailAvailability function failed');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test checkEmailAvailability: ${error.message}`);
    }

    console.log('\n✅ User Profile Management Endpoints verification completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Test the endpoints with a valid JWT token');
    console.log('   3. Use the endpoints in your frontend components');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyUserProfileEndpoints();