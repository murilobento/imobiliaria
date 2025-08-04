/**
 * JWT token management utilities
 * Handles token generation, verification, and validation for authentication
 */

import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, User, AuthError } from '@/types/auth';

// JWT configuration constants
const JWT_ALGORITHM = 'HS256';
const DEFAULT_EXPIRES_IN = '1h';

/**
 * Get JWT secret from environment variables
 * @throws Error if JWT_SECRET is not configured
 */
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Get JWT expiration time from environment or use default
 */
function getJWTExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
}

/**
 * Generate a secure JWT token for an authenticated user
 * @param user - The authenticated user object
 * @returns Promise<string> - The signed JWT token
 */
export async function generateJWTToken(user: User): Promise<string> {
  try {
    const secret = getJWTSecret();
    const expiresIn = getJWTExpiresIn();

    const jwt = await new SignJWT({
      username: user.username,
      role: user.role
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setSubject(user.id)
      .sign(secret);

    return jwt;
  } catch (error) {
    throw new Error(`Failed to generate JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns Promise<JWTPayload> - The decoded and verified payload
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifyJWTToken(token: string): Promise<JWTPayload> {
  try {
    const secret = getJWTSecret();
    
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    // Validate required payload fields
    if (!payload.sub || !payload.username || !payload.role || !payload.iat || !payload.exp) {
      throw new Error('Invalid token payload: missing required fields');
    }

    // Type assertion after validation
    const jwtPayload: JWTPayload = {
      sub: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string,
      iat: payload.iat as number,
      exp: payload.exp as number
    };

    return jwtPayload;
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific JWT errors
      if (error.message.includes('expired')) {
        throw new Error('TOKEN_EXPIRED');
      }
      if (error.message.includes('signature')) {
        throw new Error('TOKEN_INVALID');
      }
      if (error.message.includes('malformed')) {
        throw new Error('TOKEN_INVALID');
      }
    }
    
    throw new Error(`TOKEN_INVALID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate a JWT token and return user information
 * @param token - The JWT token to validate
 * @returns Promise<{ valid: boolean; user?: User; error?: AuthError }>
 */
export async function validateJWTToken(token: string): Promise<{
  valid: boolean;
  user?: User;
  error?: AuthError;
}> {
  try {
    const payload = await verifyJWTToken(token);
    
    // Convert JWT payload to User object
    const user: User = {
      id: payload.sub,
      username: payload.username,
      email: '', // This would need to be fetched from DB if needed
      role: 'admin',
      is_active: true, // Assume active if JWT is valid
      created_at: '', // This would need to be fetched from DB if needed
      updated_at: '', // This would need to be fetched from DB if needed
      last_login: null, // This would need to be fetched from DB if needed
      created_by: null // This would need to be fetched from DB if needed
    };

    return {
      valid: true,
      user
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    let authError: AuthError = 'TOKEN_INVALID';
    if (errorMessage.includes('TOKEN_EXPIRED')) {
      authError = 'TOKEN_EXPIRED';
    }

    return {
      valid: false,
      error: authError
    };
  }
}

/**
 * Check if a JWT token is expired without full verification
 * Useful for quick expiration checks without cryptographic verification
 * @param token - The JWT token to check
 * @returns boolean - True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Decode without verification to check expiration
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true; // Malformed token is considered expired
    }

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return !payload.exp || payload.exp < now;
  } catch {
    return true; // Any error means token is invalid/expired
  }
}

/**
 * Extract user ID from JWT token without full verification
 * Useful for logging and rate limiting purposes
 * @param token - The JWT token
 * @returns string | null - User ID or null if extraction fails
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Get token expiration time as Date object
 * @param token - The JWT token
 * @returns Date | null - Expiration date or null if extraction fails
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Refresh token logic placeholder
 * In a full implementation, this would handle token refresh
 * For now, it returns a new token with extended expiration
 * @param oldToken - The token to refresh
 * @returns Promise<string | null> - New token or null if refresh fails
 */
export async function refreshJWTToken(oldToken: string): Promise<string | null> {
  try {
    // Verify the old token first
    const payload = await verifyJWTToken(oldToken);
    
    // Create a new user object from the payload
    const user: User = {
      id: payload.sub,
      username: payload.username,
      email: '', // Not available from JWT
      role: 'admin',
      is_active: true, // Assume active if JWT is valid
      created_at: '',
      updated_at: '',
      last_login: null,
      created_by: null
    };

    // Generate a new token
    return await generateJWTToken(user);
  } catch {
    return null; // Refresh failed
  }
}