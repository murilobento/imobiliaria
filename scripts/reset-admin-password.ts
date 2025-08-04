#!/usr/bin/env tsx

/**
 * Reset Admin Password Script
 * 
 * This script resets the admin user password and displays the new credentials.
 * 
 * Usage:
 *   npx tsx scripts/reset-admin-password.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create a service role client for admin operations
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration for service operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Generate a secure random password with guaranteed character diversity
 */
function generateSecurePassword(length: number = 16): string {
  if (length < 12) {
    throw new Error('Password length must be at least 12 characters for security');
  }
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => crypto.randomInt(0, 3) - 1).join('');
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
}

/**
 * Reset admin password
 */
async function resetAdminPassword(): Promise<{ username: string; password: string } | null> {
  try {
    const supabase = createServiceClient();
    
    // Check if admin user exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('auth_users')
      .select('id, username')
      .eq('username', 'admin')
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        console.error('❌ Admin user not found. Please run setup-initial-admin.ts first.');
        return null;
      }
      console.error('❌ Error checking for admin user:', checkError);
      return null;
    }
    
    // Generate new secure password
    const newPassword = generateSecurePassword();
    const passwordHash = await hashPassword(newPassword);
    
    // Update admin password
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({ 
        password_hash: passwordHash,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('username', 'admin');
    
    if (updateError) {
      console.error('❌ Error updating admin password:', updateError);
      return null;
    }
    
    console.log('✅ Admin password reset successfully');
    console.log('🔐 Username: admin');
    console.log('🔑 New Password:', newPassword);
    console.log('⚠️  Please change this password after logging in!');
    
    return { username: 'admin', password: newPassword };
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    return null;
  }
}

/**
 * Show current admin info (without password)
 */
async function showAdminInfo(): Promise<void> {
  try {
    const supabase = createServiceClient();
    
    const { data: admin, error } = await supabase
      .from('auth_users')
      .select('id, username, role, created_at, last_login, failed_attempts, locked_until')
      .eq('username', 'admin')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Admin user not found');
        return;
      }
      console.error('❌ Error fetching admin info:', error);
      return;
    }
    
    console.log('📋 Current Admin User Info:');
    console.log('==========================');
    console.log(`ID: ${admin.id}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Created: ${new Date(admin.created_at).toLocaleString()}`);
    console.log(`Last Login: ${admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}`);
    console.log(`Failed Attempts: ${admin.failed_attempts || 0}`);
    console.log(`Locked Until: ${admin.locked_until ? new Date(admin.locked_until).toLocaleString() : 'Not locked'}`);
    
  } catch (error) {
    console.error('❌ Error showing admin info:', error);
  }
}

async function main() {
  console.log('🔐 Admin Password Reset Tool');
  console.log('============================\n');

  try {
    // Show current admin info
    await showAdminInfo();
    
    console.log('\n🔄 Resetting admin password...\n');
    
    // Reset password
    const result = await resetAdminPassword();
    
    if (!result) {
      console.error('❌ Failed to reset admin password');
      process.exit(1);
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Navigate to http://localhost:3000/login');
    console.log('3. Use the credentials shown above to log in');
    console.log('4. ⚠️  IMPORTANT: Change this password after first login!');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
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

// Run the reset
main();