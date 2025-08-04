/**
 * Password hashing and verification utilities
 * Implements secure password handling with bcrypt and timing attack protection
 */

import bcrypt from 'bcryptjs';
import { PasswordValidationResult } from '@/types/auth';

// Default configuration - can be overridden by environment variables
const DEFAULT_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Get salt rounds from environment or use default
 */
function getSaltRounds(): number {
  const envRounds = process.env.BCRYPT_ROUNDS;
  if (envRounds) {
    const rounds = parseInt(envRounds, 10);
    if (rounds >= 10 && rounds <= 15) {
      return rounds;
    }
  }
  return DEFAULT_SALT_ROUNDS;
}

/**
 * Hash a password using bcrypt with configurable salt rounds
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 * @throws Error if password is invalid or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`);
  }

  try {
    const saltRounds = getSaltRounds();
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash with timing attack protection
 * Uses bcrypt.compare which includes timing attack protection
 * @param password - Plain text password to verify
 * @param hash - Stored password hash
 * @returns Promise<boolean> - True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || typeof password !== 'string') {
    return false;
  }

  if (!hash || typeof hash !== 'string') {
    return false;
  }

  try {
    // bcrypt.compare provides timing attack protection by design
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    // Log error but don't expose details to prevent information leakage
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Validate password strength according to security requirements
 * @param password - Password to validate
 * @returns PasswordValidationResult - Validation result with errors if any
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Length validation
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  // Character type requirements
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }

  if (!hasSpecialChars) {
    errors.push('Password must contain at least one special character');
  }

  // Common password patterns to avoid
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^admin/i,
    /^qwerty/i,
    /^letmein/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns and is not secure');
      break;
    }
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a secure random password for initial setup
 * @param length - Length of password to generate (default: 16)
 * @returns string - Generated secure password
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + specialChars;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if a password hash needs to be rehashed (e.g., if salt rounds changed)
 * @param hash - Current password hash
 * @returns boolean - True if hash should be updated
 */
export function needsRehash(hash: string): boolean {
  try {
    const currentRounds = getSaltRounds();
    const hashRounds = bcrypt.getRounds(hash);
    return hashRounds !== currentRounds;
  } catch (error) {
    // If we can't determine rounds, assume rehash is needed
    return true;
  }
}