#!/usr/bin/env node

/**
 * Test script for user password change API
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_BASE_URL = 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPasswordAPI() {
  console.log('🔐 Testing User Password Change API...\n');

  try {
    // 1. Test without authentication
    console.log('1. Testing without authentication...');
    
    const unauthResponse = await fetch(`${API_BASE_URL}/api/user/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'test',
        newPassword: 'test123',
        confirmPassword: 'test123'
      })
    });
    
    const unauthData = await unauthResponse.json();
    
    if (unauthResponse.status === 401 && !unauthData.success) {
      console.log('   ✅ PATCH /api/user/password correctly requires authentication');
    } else {
      console.log('   ❌ PATCH /api/user/password should require authentication');
    }

    // 2. Try to sign in with a test user
    console.log('\n2. Attempting to sign in with test user...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@imobiliaria.com',
      password: 'admin123'
    });

    if (signInError) {
      console.log(`   ❌ Sign in failed: ${signInError.message}`);
      return;
    }

    console.log('   ✅ Successfully signed in');
    const accessToken = signInData.session?.access_token;

    if (!accessToken) {
      console.log('   ❌ No access token received');
      return;
    }

    // 3. Test password change with wrong current password
    console.log('\n3. Testing password change with wrong current password...');
    
    const wrongPasswordResponse = await fetch(`${API_BASE_URL}/api/user/password`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      })
    });

    const wrongPasswordData = await wrongPasswordResponse.json();
    
    if (!wrongPasswordResponse.ok && !wrongPasswordData.success) {
      console.log('   ✅ Password change correctly rejects wrong current password');
    } else {
      console.log('   ❌ Password change should reject wrong current password');
    }

    // 4. Test password change with mismatched confirmation
    console.log('\n4. Testing password change with mismatched confirmation...');
    
    const mismatchResponse = await fetch(`${API_BASE_URL}/api/user/password`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: 'admin123',
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword'
      })
    });

    const mismatchData = await mismatchResponse.json();
    
    if (!mismatchResponse.ok && !mismatchData.success) {
      console.log('   ✅ Password change correctly rejects mismatched passwords');
    } else {
      console.log('   ❌ Password change should reject mismatched passwords');
    }

    // 5. Test password change with weak password
    console.log('\n5. Testing password change with weak password...');
    
    const weakPasswordResponse = await fetch(`${API_BASE_URL}/api/user/password`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: 'admin123',
        newPassword: '123',
        confirmPassword: '123'
      })
    });

    const weakPasswordData = await weakPasswordResponse.json();
    
    if (!weakPasswordResponse.ok && !weakPasswordData.success) {
      console.log('   ✅ Password change correctly rejects weak passwords');
    } else {
      console.log('   ❌ Password change should reject weak passwords');
    }

    // 6. Sign out
    await supabase.auth.signOut();
    console.log('\n   ✅ Signed out successfully');

    console.log('\n🎉 Password API testing completed!');
    console.log('\n💡 Note: We didn\'t test successful password change to avoid changing the test user\'s password');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testPasswordAPI();