/**
 * Supabase Admin Functions
 * Funções para gerenciar usuários usando Supabase Auth Admin API
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export interface SupabaseUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_active: boolean;
}

export interface UserListResponse {
  users: SupabaseUser[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Get list of users from Supabase Auth
 */
export async function getSupabaseUsersList(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<UserListResponse> {
  const supabase = createSupabaseAdmin();
  
  try {
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get users from Supabase Auth
    const { data, error, count } = await supabase.auth.admin.listUsers({
      page,
      perPage: limit
    });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Filter users by search term if provided
    let filteredUsers = data.users || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.user_metadata?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Convert to our format
    const users: SupabaseUser[] = filteredUsers.map(user => ({
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      is_active: !user.banned_until && user.email_confirmed_at !== null
    }));

    return {
      users,
      total: search ? filteredUsers.length : (count || 0),
      page,
      limit
    };

  } catch (error) {
    console.error('Error fetching Supabase users:', error);
    throw error;
  }
}

/**
 * Create a new user in Supabase Auth
 */
export async function createSupabaseUser(
  email: string,
  password: string,
  role: string = 'user',
  name?: string
): Promise<SupabaseUser> {
  const supabase = createSupabaseAdmin();
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role,
        name: name || email.split('@')[0]
      }
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('User creation failed - no user returned');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      role: data.user.user_metadata?.role || 'user',
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at,
      email_confirmed_at: data.user.email_confirmed_at,
      is_active: true
    };

  } catch (error) {
    console.error('Error creating Supabase user:', error);
    throw error;
  }
}

/**
 * Update user status (ban/unban)
 */
export async function updateSupabaseUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const supabase = createSupabaseAdmin();
  
  try {
    if (isActive) {
      // Unban user
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      });
      
      if (error) {
        throw new Error(`Failed to activate user: ${error.message}`);
      }
    } else {
      // Ban user indefinitely
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: '876000h' // ~100 years
      });
      
      if (error) {
        throw new Error(`Failed to deactivate user: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

/**
 * Update user role in Supabase Auth metadata
 */
export async function updateSupabaseUserRole(
  userId: string,
  role: string
): Promise<void> {
  const supabase = createSupabaseAdmin();
  
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: role
      }
    });
    
    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Update user status and/or role
 */
export async function updateSupabaseUser(
  userId: string,
  updates: {
    isActive?: boolean;
    role?: string;
    fullName?: string;
    username?: string;
    email?: string;
  }
): Promise<SupabaseUser> {
  const supabase = createSupabaseAdmin();
  
  try {
    // Get current user data to preserve existing metadata
    const { data: currentUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (getUserError || !currentUser.user) {
      throw new Error(`Failed to get current user: ${getUserError?.message || 'User not found'}`);
    }

    // Prepare update data
    const updateData: any = {};
    
    if (updates.isActive !== undefined) {
      if (updates.isActive) {
        updateData.ban_duration = 'none';
      } else {
        updateData.ban_duration = '876000h'; // ~100 years
      }
    }
    
    // Update email if provided
    if (updates.email !== undefined) {
      updateData.email = updates.email;
    }
    
    // Prepare user_metadata updates
    const currentMetadata = currentUser.user.user_metadata || {};
    const newMetadata = { ...currentMetadata };
    
    if (updates.role !== undefined) {
      newMetadata.role = updates.role;
    }
    
    if (updates.fullName !== undefined) {
      newMetadata.name = updates.fullName;
    }
    
    // Only update metadata if there are changes
    if (updates.role !== undefined || updates.fullName !== undefined) {
      updateData.user_metadata = newMetadata;
    }
    
    // Update user
    const { data, error } = await supabase.auth.admin.updateUserById(userId, updateData);
    
    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
    
    if (!data.user) {
      throw new Error('User not found');
    }
    
    // Convert to our SupabaseUser format
    return {
      id: data.user.id,
      email: data.user.email || '',
      role: data.user.user_metadata?.role || 'real-estate-agent',
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at,
      email_confirmed_at: data.user.email_confirmed_at,
      is_active: !data.user.banned_until, // User is active if not banned
      user_metadata: data.user.user_metadata // Include full metadata
    } as any;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Check if email is available
 */
export async function checkSupabaseEmailAvailability(email: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Failed to check email availability: ${error.message}`);
    }

    // Check if email already exists
    const existingUser = data.users.find(user => user.email === email);
    return !existingUser;

  } catch (error) {
    console.error('Error checking email availability:', error);
    throw error;
  }
}