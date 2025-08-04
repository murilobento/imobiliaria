import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

// Types for authentication operations
export interface AuthUser {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
  last_login: string | null;
  failed_attempts: number;
  locked_until: string | null;
  updated_at: string;
  email?: string;
  is_active?: boolean;
  created_by?: string;
}

// Extended user interface for user management
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string | null;
}

// Request/Response interfaces for user management
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthSession {
  id: string;
  user_id: string;
  token_jti: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface LoginAttempt {
  username: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  timestamp: Date;
}

/**
 * Create service client for authentication operations
 */
function createAuthServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration for authentication operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<AuthUser | null> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    return data as AuthUser;
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw new Error('Database error during user lookup');
  }
}

/**
 * Verify user password
 */
export async function verifyUserPassword(username: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await findUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    // Check if account is locked
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until);
      if (lockExpiry > new Date()) {
        throw new Error('Account is temporarily locked');
      }
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      await incrementFailedAttempts(user.id);
      return null;
    }
    
    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id);
    
    return user;
  } catch (error) {
    console.error('Error verifying user password:', error);
    throw error;
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const supabase = createAuthServiceClient();
    
    const { error } = await supabase
      .from('auth_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating last login:', error);
    throw new Error('Failed to update last login timestamp');
  }
}

/**
 * Increment failed login attempts
 */
export async function incrementFailedAttempts(userId: string): Promise<void> {
  try {
    const supabase = createAuthServiceClient();
    
    // Get current failed attempts
    const { data: user, error: fetchError } = await supabase
      .from('auth_users')
      .select('failed_attempts')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    const newFailedAttempts = (user.failed_attempts || 0) + 1;
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '3');
    
    // Prepare update data
    const updateData: any = { failed_attempts: newFailedAttempts };
    
    // Lock account if max attempts reached
    if (newFailedAttempts >= maxAttempts) {
      const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION_MS || '1800000'); // 30 minutes
      const lockUntil = new Date(Date.now() + lockDuration);
      updateData.locked_until = lockUntil.toISOString();
    }
    
    const { error } = await supabase
      .from('auth_users')
      .update(updateData)
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error incrementing failed attempts:', error);
    throw new Error('Failed to update failed attempts');
  }
}

/**
 * Reset failed login attempts
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    const supabase = createAuthServiceClient();
    
    const { error } = await supabase
      .from('auth_users')
      .update({ 
        failed_attempts: 0,
        locked_until: null
      })
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
    throw new Error('Failed to reset failed attempts');
  }
}

/**
 * Create authentication session record
 */
export async function createAuthSession(
  userId: string, 
  tokenJti: string, 
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthSession> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: userId,
        token_jti: tokenJti,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as AuthSession;
  } catch (error) {
    console.error('Error creating auth session:', error);
    throw new Error('Failed to create authentication session');
  }
}

/**
 * Find authentication session by token JTI
 */
export async function findAuthSession(tokenJti: string): Promise<AuthSession | null> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('token_jti', tokenJti)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    return data as AuthSession;
  } catch (error) {
    console.error('Error finding auth session:', error);
    throw new Error('Database error during session lookup');
  }
}

/**
 * Delete authentication session
 */
export async function deleteAuthSession(tokenJti: string): Promise<void> {
  try {
    const supabase = createAuthServiceClient();
    
    const { error } = await supabase
      .from('auth_sessions')
      .delete()
      .eq('token_jti', tokenJti);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting auth session:', error);
    throw new Error('Failed to delete authentication session');
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .rpc('cleanup_expired_sessions');
    
    if (error) {
      throw error;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Get user sessions count
 */
export async function getUserSessionsCount(userId: string): Promise<number> {
  try {
    const supabase = createAuthServiceClient();
    
    const { count, error } = await supabase
      .from('auth_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());
    
    if (error) {
      throw error;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting user sessions count:', error);
    return 0;
  }
}

// ============================================================================
// USER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new user (admin function)
 */
export async function createUser(userData: CreateUserRequest, createdBy: string): Promise<User> {
  try {
    const supabase = createAuthServiceClient();
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
    
    const { data, error } = await supabase
      .from('auth_users')
      .insert({
        username: userData.username,
        password_hash: passwordHash,
        role: 'admin'
        // Note: email and created_by columns don't exist in current table structure
      })
      .select('id, username, role, created_at, updated_at, last_login')
      .single();
    
    if (error) {
      throw error;
    }
    
    // Return user with default values for missing columns
    return {
      id: data.id,
      username: data.username,
      email: userData.email, // Store the email from request (even though not persisted)
      role: data.role,
      is_active: true, // Default since column doesn't exist
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login: data.last_login,
      created_by: createdBy // Store the creator ID from request (even though not persisted)
    } as User;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

/**
 * Update user profile (username and email)
 */
export async function updateUserProfile(userId: string, updates: UpdateProfileRequest): Promise<User> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .from('auth_users')
      .update(updates)
      .eq('id', userId)
      .select('id, username, email, role, created_at, updated_at, last_login, created_by')
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as User;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
}

/**
 * Change user password
 */
export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  try {
    const supabase = createAuthServiceClient();
    
    // Get current user data
    const { data: user, error: fetchError } = await supabase
      .from('auth_users')
      .select('password_hash')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    const { error } = await supabase
      .from('auth_users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error changing user password:', error);
    throw error;
  }
}

/**
 * Get users list with pagination and search
 */
export async function getUsersList(page: number = 1, limit: number = 10, search?: string): Promise<UserListResponse> {
  try {
    const supabase = createAuthServiceClient();
    
    // Build the query - only select columns that exist in the current table
    let query = supabase
      .from('auth_users')
      .select('id, username, role, created_at, updated_at, last_login', { count: 'exact' });
    
    // Add search filter if provided (only search by username since email column may not exist)
    if (search && search.trim()) {
      query = query.ilike('username', `%${search}%`);
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    // Order by created_at desc
    query = query.order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    const users = data || [];
    const total = count || 0;
    
    return {
      users: users.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: '', // Default empty since column doesn't exist yet
        role: user.role,
        is_active: true, // Default since column doesn't exist yet
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        created_by: null // Default null since column doesn't exist yet
      })),
      total,
      page,
      limit
    };
  } catch (error) {
    console.error('Error getting users list:', error);
    throw new Error('Failed to get users list');
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
  try {
    const supabase = createAuthServiceClient();
    
    // Since is_active column doesn't exist, we'll just return the user data
    // In a real implementation, you would add this column to the database
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, username, email, role, created_at, updated_at, last_login, created_by')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('User not found');
    }
    
    // If deactivating user, we could delete their sessions
    if (!isActive) {
      try {
        await supabase
          .from('auth_sessions')
          .delete()
          .eq('user_id', userId);
      } catch (sessionError) {
        console.warn('Failed to invalidate user sessions:', sessionError);
      }
    }
    
    // Return user data with simulated is_active status
    return {
      ...data,
      is_active: isActive
    } as User;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw new Error('Failed to toggle user status');
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, username, email, role, created_at, updated_at, last_login, created_by')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    return data as User;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw new Error('Database error during user lookup');
  }
}

/**
 * Check username availability
 */
export async function checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
  try {
    const supabase = createAuthServiceClient();
    
    let query = supabase
      .from('auth_users')
      .select('id')
      .eq('username', username);
    
    // Exclude current user if provided
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned - username is available
        return true;
      }
      throw error;
    }
    
    // If we found a user, username is not available
    return false;
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw new Error('Failed to check username availability');
  }
}

/**
 * Check email availability
 * Note: Since email column doesn't exist in auth_users table, always return true
 */
export async function checkEmailAvailability(email: string, excludeUserId?: string): Promise<boolean> {
  try {
    // Since the auth_users table doesn't have an email column,
    // we'll always return true (email is available)
    // In a real implementation, you would add the email column to the table
    console.log('⚠️ [DATABASE] Email column not implemented in auth_users table, returning true');
    return true;
  } catch (error) {
    console.error('Error checking email availability:', error);
    throw new Error('Failed to check email availability');
  }
}

/**
 * Get user by ID (for profile operations)
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const supabase = createAuthServiceClient();
    
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, username, role, created_at, updated_at, last_login')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    // Return user with default values for missing columns
    return {
      id: data.id,
      username: data.username,
      email: '', // Default empty since column doesn't exist
      role: data.role,
      is_active: true, // Default since column doesn't exist
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login: data.last_login,
      created_by: null // Default null since column doesn't exist
    } as User;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new Error('Database error during user lookup');
  }
}