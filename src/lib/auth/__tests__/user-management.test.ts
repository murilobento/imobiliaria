import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createUser,
  updateUserProfile,
  changeUserPassword,
  getUsersList,
  toggleUserStatus,
  findUserByEmail,
  checkUsernameAvailability,
  checkEmailAvailability,
  getUserById,
  type CreateUserRequest,
  type UpdateProfileRequest
} from '../database';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
};

const mockFrom = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn()
};

const mockSelect = {
  eq: vi.fn(),
  single: vi.fn()
};

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

// Mock Supabase client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

describe('User Management Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock chain
    mockSupabaseClient.from.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockSelect);
    mockSelect.eq.mockReturnValue(mockSelect);
    mockSelect.single.mockReturnValue({ data: null, error: null });
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const createdBy = 'admin-user-id';
      
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: createdBy
      };

      // Mock bcrypt hash
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');

      // Mock successful database insert
      mockFrom.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await createUser(userData, createdBy);

      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_users');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        role: 'admin',
        is_active: true,
        created_by: createdBy
      });
    });

    it('should throw error when database insert fails', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Mock bcrypt hash
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');

      // Mock database error
      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Duplicate username' } 
      });

      await expect(createUser(userData, 'admin-id')).rejects.toThrow('Failed to create user');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-id';
      const updates: UpdateProfileRequest = {
        username: 'newusername',
        email: 'newemail@example.com'
      };
      
      const mockUpdatedUser = {
        id: userId,
        username: 'newusername',
        email: 'newemail@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockFrom.single.mockResolvedValue({ data: mockUpdatedUser, error: null });

      const result = await updateUserProfile(userId, updates);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockFrom.update).toHaveBeenCalledWith(updates);
      expect(mockFrom.eq).toHaveBeenCalledWith('id', userId);
    });
  });

  describe('changeUserPassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-id';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';
      
      const mockUser = {
        password_hash: 'old-hashed-password'
      };

      // Mock getting current user
      mockSelect.single.mockResolvedValue({ data: mockUser, error: null });
      
      // Mock password verification and hashing
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password');
      
      // Mock password update
      mockFrom.eq.mockReturnValue({ error: null });

      await changeUserPassword(userId, currentPassword, newPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'old-hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockFrom.update).toHaveBeenCalledWith({ password_hash: 'new-hashed-password' });
    });

    it('should throw error for incorrect current password', async () => {
      const userId = 'user-id';
      const currentPassword = 'wrongpassword';
      const newPassword = 'newpassword';
      
      const mockUser = {
        password_hash: 'old-hashed-password'
      };

      mockSelect.single.mockResolvedValue({ data: mockUser, error: null });
      
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(changeUserPassword(userId, currentPassword, newPassword))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('getUsersList', () => {
    it('should return paginated users list', async () => {
      const mockUsersData = [
        {
          id: 'user1',
          username: 'user1',
          email: 'user1@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: null,
          created_by: 'admin-id',
          total_count: 2
        },
        {
          id: 'user2',
          username: 'user2',
          email: 'user2@example.com',
          role: 'admin',
          is_active: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: null,
          created_by: 'admin-id',
          total_count: 2
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockUsersData, error: null });

      const result = await getUsersList(1, 10, 'user');

      expect(result).toEqual({
        users: mockUsersData.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: user.last_login,
          created_by: user.created_by
        })),
        total: 2,
        page: 1,
        limit: 10
      });

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_users_list', {
        p_page: 1,
        p_limit: 10,
        p_search: 'user'
      });
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status and invalidate sessions when deactivating', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockFrom.single.mockResolvedValue({ data: mockUser, error: null });
      mockSupabaseClient.rpc.mockResolvedValue({ data: 1, error: null });

      const result = await toggleUserStatus(userId, false);

      expect(result).toEqual(mockUser);
      expect(mockFrom.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('invalidate_user_sessions', { p_user_id: userId });
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return true when username is available', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null });

      const result = await checkUsernameAvailability('newusername');

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('check_username_availability', {
        p_username: 'newusername',
        p_exclude_user_id: null
      });
    });

    it('should return false when username is taken', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: false, error: null });

      const result = await checkUsernameAvailability('existinguser');

      expect(result).toBe(false);
    });
  });

  describe('checkEmailAvailability', () => {
    it('should return true when email is available', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null });

      const result = await checkEmailAvailability('new@example.com');

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('check_email_availability', {
        p_email: 'new@example.com',
        p_exclude_user_id: null
      });
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockSelect.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockSelect.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should return null when user not found', async () => {
      mockSelect.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      const result = await findUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockSelect.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await getUserById('user-id');

      expect(result).toEqual(mockUser);
      expect(mockSelect.eq).toHaveBeenCalledWith('id', 'user-id');
    });

    it('should return null when user not found', async () => {
      mockSelect.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      const result = await getUserById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      mockSelect.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      await expect(getUserById('user-id')).rejects.toThrow('Database error during user lookup');
    });
  });

  describe('createUser - additional tests', () => {
    it('should hash password with correct salt rounds', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
      mockFrom.single.mockResolvedValue({ data: {}, error: null });

      await createUser(userData, 'admin-id');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should set default role to admin', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
      mockFrom.single.mockResolvedValue({ data: {}, error: null });

      await createUser(userData, 'admin-id');

      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
          is_active: true
        })
      );
    });

    it('should handle bcrypt hashing errors', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.hash).mockRejectedValue(new Error('Hashing failed'));

      await expect(createUser(userData, 'admin-id')).rejects.toThrow('Failed to create user');
    });
  });

  describe('updateUserProfile - additional tests', () => {
    it('should handle partial updates', async () => {
      const userId = 'user-id';
      const updates: UpdateProfileRequest = {
        username: 'newusername'
        // email not provided
      };
      
      const mockUpdatedUser = {
        id: userId,
        username: 'newusername',
        email: 'original@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockFrom.single.mockResolvedValue({ data: mockUpdatedUser, error: null });

      const result = await updateUserProfile(userId, updates);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockFrom.update).toHaveBeenCalledWith({ username: 'newusername' });
    });

    it('should throw error on database update failure', async () => {
      const userId = 'user-id';
      const updates: UpdateProfileRequest = {
        username: 'newusername'
      };

      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      await expect(updateUserProfile(userId, updates)).rejects.toThrow('Failed to update user profile');
    });
  });

  describe('changeUserPassword - additional tests', () => {
    it('should handle user not found during password change', async () => {
      const userId = 'nonexistent-user';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';

      mockSelect.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      await expect(changeUserPassword(userId, currentPassword, newPassword))
        .rejects.toThrow();
    });

    it('should handle database error during password verification', async () => {
      const userId = 'user-id';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';

      mockSelect.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(changeUserPassword(userId, currentPassword, newPassword))
        .rejects.toThrow();
    });

    it('should handle password update failure', async () => {
      const userId = 'user-id';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';
      
      const mockUser = {
        password_hash: 'old-hashed-password'
      };

      mockSelect.single.mockResolvedValue({ data: mockUser, error: null });
      
      const bcrypt = await import('bcryptjs');
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password');
      
      mockFrom.eq.mockReturnValue({ error: { message: 'Update failed' } });

      await expect(changeUserPassword(userId, currentPassword, newPassword))
        .rejects.toThrow();
    });
  });

  describe('getUsersList - additional tests', () => {
    it('should handle empty results', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getUsersList(1, 10);

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 10
      });
    });

    it('should handle default parameters', async () => {
      const mockUsersData = [
        {
          id: 'user1',
          username: 'user1',
          email: 'user1@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: null,
          created_by: 'admin-id',
          total_count: 1
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockUsersData, error: null });

      const result = await getUsersList();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_users_list', {
        p_page: 1,
        p_limit: 10,
        p_search: null
      });
    });

    it('should handle database error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC failed' } 
      });

      await expect(getUsersList(1, 10)).rejects.toThrow('Failed to get users list');
    });
  });

  describe('toggleUserStatus - additional tests', () => {
    it('should activate user without invalidating sessions', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockFrom.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await toggleUserStatus(userId, true);

      expect(result).toEqual(mockUser);
      expect(mockFrom.update).toHaveBeenCalledWith({ is_active: true });
      expect(mockSupabaseClient.rpc).not.toHaveBeenCalledWith('invalidate_user_sessions', expect.any(Object));
    });

    it('should handle database error during status update', async () => {
      const userId = 'user-id';

      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      await expect(toggleUserStatus(userId, false)).rejects.toThrow('Failed to toggle user status');
    });

    it('should handle session invalidation error', async () => {
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: 'admin-id'
      };

      mockFrom.single.mockResolvedValue({ data: mockUser, error: null });
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC failed' } 
      });

      // Should still return the user even if session invalidation fails
      const result = await toggleUserStatus(userId, false);
      expect(result).toEqual(mockUser);
    });
  });

  describe('checkUsernameAvailability - additional tests', () => {
    it('should handle database error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC failed' } 
      });

      await expect(checkUsernameAvailability('username')).rejects.toThrow('Failed to check username availability');
    });

    it('should pass exclude user ID parameter', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null });

      await checkUsernameAvailability('username', 'exclude-user-id');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('check_username_availability', {
        p_username: 'username',
        p_exclude_user_id: 'exclude-user-id'
      });
    });
  });

  describe('checkEmailAvailability - additional tests', () => {
    it('should handle database error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC failed' } 
      });

      await expect(checkEmailAvailability('email@example.com')).rejects.toThrow('Failed to check email availability');
    });

    it('should pass exclude user ID parameter', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null });

      await checkEmailAvailability('email@example.com', 'exclude-user-id');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('check_email_availability', {
        p_email: 'email@example.com',
        p_exclude_user_id: 'exclude-user-id'
      });
    });
  });

  describe('findUserByEmail - additional tests', () => {
    it('should handle database error', async () => {
      mockSelect.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(findUserByEmail('test@example.com')).rejects.toThrow('Database error during user lookup');
    });
  });
});