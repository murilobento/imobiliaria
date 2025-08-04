import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Export for testing
export { generateSecurePassword, validatePasswordStrength };

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
 * Validate password strength
 */
function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
}

/**
 * Check if default admin user exists
 */
export async function checkDefaultAdminExists(): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('auth_users')
      .select('id')
      .eq('username', 'admin')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for default admin:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking default admin existence:', error);
    return false;
  }
}

/**
 * Create default admin user
 */
export async function createDefaultAdmin(): Promise<{ username: string; password: string } | null> {
  try {
    const supabase = createServiceClient();
    
    // Check if admin already exists
    const adminExists = await checkDefaultAdminExists();
    if (adminExists) {
      console.log('Default admin user already exists');
      return null;
    }
    
    // Generate secure password
    const password = generateSecurePassword();
    const passwordHash = await hashPassword(password);
    
    // Create admin user
    const { data, error } = await supabase
      .from('auth_users')
      .insert({
        username: 'admin',
        password_hash: passwordHash,
        role: 'admin'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating default admin:', error);
      return null;
    }
    
    console.log('✅ Default admin user created successfully');
    console.log('🔐 Username: admin');
    console.log('🔑 Password:', password);
    console.log('⚠️  Please change this password after first login!');
    
    return { username: 'admin', password };
  } catch (error) {
    console.error('Error creating default admin:', error);
    return null;
  }
}

/**
 * Initialize authentication database setup
 */
export async function initializeAuthDatabase(): Promise<boolean> {
  try {
    console.log('🚀 Initializing authentication database...');
    
    // Create default admin if it doesn't exist
    const adminCreated = await createDefaultAdmin();
    
    if (adminCreated) {
      console.log('✅ Authentication database initialized successfully');
      return true;
    } else {
      console.log('ℹ️  Authentication database already initialized');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to initialize authentication database:', error);
    return false;
  }
}

/**
 * Validate environment configuration for authentication
 */
export async function validateEnvironmentConfig(): Promise<boolean> {
  const errors: string[] = [];
  
  // Required environment variables
  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'JWT_SECRET': process.env.JWT_SECRET,
  };
  
  // Check for missing required variables
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });
  
  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    if (jwtSecret === 'your-super-secret-jwt-key-here-change-in-production') {
      errors.push('JWT_SECRET must be changed from default value');
    }
  }
  
  // Validate CSRF_SECRET if provided
  const csrfSecret = process.env.CSRF_SECRET;
  if (csrfSecret && csrfSecret === 'your-csrf-secret-here-change-in-production') {
    errors.push('CSRF_SECRET must be changed from default value');
  }
  
  // Validate numeric configurations
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  if (bcryptRounds < 10 || bcryptRounds > 15) {
    errors.push('BCRYPT_ROUNDS should be between 10 and 15 for optimal security/performance balance');
  }
  
  const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5');
  if (rateLimitMax < 3 || rateLimitMax > 20) {
    errors.push('RATE_LIMIT_MAX_ATTEMPTS should be between 3 and 20');
  }
  
  // Validate JWT expiration format
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
  if (!/^\d+[smhd]$/.test(jwtExpiresIn)) {
    errors.push('JWT_EXPIRES_IN must be in format like "1h", "30m", "7d"');
  }
  
  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://') && !supabaseUrl.includes('.supabase.co')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL appears to be invalid');
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  console.log('✅ Environment configuration is valid');
  return true;
}

/**
 * Validate database configuration
 */
export async function validateAuthDatabaseConfig(): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // Test connection by checking if auth_users table exists
    const { error } = await supabase
      .from('auth_users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Auth database validation failed:', error.message);
      
      // Provide helpful error messages based on common issues
      if (error.message.includes('relation "auth_users" does not exist')) {
        console.error('  Hint: Run database migrations to create the auth_users table');
      } else if (error.message.includes('Invalid API key')) {
        console.error('  Hint: Check your SUPABASE_SERVICE_ROLE_KEY environment variable');
      } else if (error.message.includes('Failed to fetch')) {
        console.error('  Hint: Check your NEXT_PUBLIC_SUPABASE_URL environment variable');
      }
      
      return false;
    }
    
    console.log('✅ Auth database configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Auth database validation error:', error);
    return false;
  }
}

/**
 * Comprehensive configuration validation
 */
export async function validateAllConfigurations(): Promise<boolean> {
  console.log('🔍 Validating authentication configuration...\n');
  
  let allValid = true;
  
  // Validate environment configuration
  const envValid = await validateEnvironmentConfig();
  if (!envValid) {
    allValid = false;
  }
  
  // Validate database configuration
  const dbValid = await validateAuthDatabaseConfig();
  if (!dbValid) {
    allValid = false;
  }
  
  if (allValid) {
    console.log('\n✅ All authentication configurations are valid');
  } else {
    console.log('\n❌ Configuration validation failed');
  }
  
  return allValid;
}