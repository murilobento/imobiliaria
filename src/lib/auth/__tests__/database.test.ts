import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables first
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
vi.stubEnv('MAX_LOGIN_ATTEMPTS', '3');
vi.stubEnv('ACCOUNT_LOCK_DURATION_MS', '1800000');

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
};

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis()
};

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn()
  }
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Import after mocking
import {
  findUserByUsername,
  verifyUserPassword,
  updateLastLogin,
  incrementFailedAttempts,
  resetFailedAttempts,
  createAuthSession,
  findAuthSession,
  deleteAuthSession,
  cleanupExpiredSessions,
  getUserSessionsCount,
  type AuthUser,
  type AuthSession
} from '../database';

describe('Authentication Database Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('findUserByUsername', () => {
    it('should find user by username successfully', async () => {
      const mockUser: AuthUser = {
        id: '123',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login: null,
        failed_attempts: 0,
        locked_until: null,
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await findUserByUsername('testuser');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_users');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('username', 'testuser');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      const result = await findUserByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'OTHER_ERROR', message: 'Database error' } 
      });

      await expect(findUserByUsername('testuser')).rejects.toThrow('Database error during user lookup');
    });
  });

  describe('verifyUserPassword', () => {
    const bcrypt = require('bcryptjs').default;

    it('should verify password successfully', async () => {
      const mockUser: AuthUser = {
        id: '123',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login: null,
        failed_attempts: 0,
        locked_until: null,
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Mock findUserByUsername
      mockQuery.single.mockResolvedValueOnce({ data: mockUser, error: null });
      
      // Mock password comparison
      bcrypt.compare.mockResolvedValue(true);
      
      // Mock resetFailedAttempts
      mockQuery.update.mockResolvedValue({ error: null });

      const result = await verifyUserPassword('testuser', 'correct_password');

      expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password');
      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid password', async () => {
      const mockUser: AuthUser = {
        id: '123',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login: null,
        failed_attempts: 0,
        locked_until: null,
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Mock findUserByUsername
      mockQuery.single.mockResolvedValueOnce({ data: mockUser, error: null });
      
      // Mock password comparison failure
      bcrypt.compare.mockResolvedValue(false);
      
      // Mock incrementFailedAttempts
      mockQuery.single.mockResolvedValueOnce({ data: { failed_attempts: 0 }, error: null });
      mockQuery.update.mockResolvedValue({ error: null });

      const result = await verifyUserPassword('testuser', 'wrong_password');

      expect(result).toBeNull();
    });

    it('should throw error for locked account', async () => {
      const mockUser: AuthUser = {
        id: '123',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login: null,
        failed_attempts: 3,
        locked_until: new Date(Date.now() + 1000000).toISOString(),
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.single.mockResolvedValue({ data: mockUser, error: null });

      await expect(verifyUserPassword('testuser', 'password')).rejects.toThrow('Account is temporarily locked');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockQuery.update.mockResolvedValue({ error: null });

      await updateLastLogin('123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_users');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_login: expect.any(String) })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should throw error on database error', async () => {
      mockQuery.update.mockResolvedValue({ error: { message: 'Update failed' } });

      await expect(updateLastLogin('123')).rejects.toThrow('Failed to update last login timestamp');
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: { failed_attempts: 1 }, 
        error: null 
      });
      mockQuery.update.mockResolvedValue({ error: null });

      await incrementFailedAttempts('123');

      expect(mockQuery.update).toHaveBeenCalledWith({ failed_attempts: 2 });
    });

    it('should lock account after max attempts', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: { failed_attempts: 2 }, 
        error: null 
      });
      mockQuery.update.mockResolvedValue({ error: null });

      await incrementFailedAttempts('123');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_attempts: 3,
          locked_until: expect.any(String)
        })
      );
    });
  });

  describe('createAuthSession', () => {
    it('should create auth session successfully', async () => {
      const mockSession: AuthSession = {
        id: 'session-123',
        user_id: 'user-123',
        token_jti: 'jti-123',
        expires_at: '2024-01-01T01:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent'
      };

      mockQuery.single.mockResolvedValue({ data: mockSession, error: null });

      const expiresAt = new Date('2024-01-01T01:00:00Z');
      const result = await createAuthSession('user-123', 'jti-123', expiresAt, '127.0.0.1', 'test-agent');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_sessions');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        token_jti: 'jti-123',
        expires_at: '2024-01-01T01:00:00.000Z',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent'
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('findAuthSession', () => {
    it('should find auth session by token JTI', async () => {
      const mockSession: AuthSession = {
        id: 'session-123',
        user_id: 'user-123',
        token_jti: 'jti-123',
        expires_at: '2024-01-01T01:00:00Z',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.single.mockResolvedValue({ data: mockSession, error: null });

      const result = await findAuthSession('jti-123');

      expect(mockQuery.eq).toHaveBeenCalledWith('token_jti', 'jti-123');
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      const result = await findAuthSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteAuthSession', () => {
    it('should delete auth session', async () => {
      mockQuery.delete.mockResolvedValue({ error: null });

      await deleteAuthSession('jti-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_sessions');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('token_jti', 'jti-123');
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: 5, error: null });

      const result = await cleanupExpiredSessions();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cleanup_expired_sessions');
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      const result = await cleanupExpiredSessions();

      expect(result).toBe(0);
    });
  });

  describe('getUserSessionsCount', () => {
    it('should get user sessions count', async () => {
      mockQuery.select.mockReturnValue({
        ...mockQuery,
        count: 3,
        error: null
      });

      const result = await getUserSessionsCount('user-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_sessions');
      expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toBe(3);
    });
  });
});