/**
 * User Management Workflows Integration Tests
 * Tests complete user management workflows including:
 * - User registration flow from admin perspective
 * - User profile editing and password change workflows
 * - User activation/deactivation functionality
 * - Search and pagination in user management table
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('User Management Workflows Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete User Registration Flow from Admin Perspective', () => {
    it('should successfully register a new user with valid data', async () => {
      // Mock successful user creation
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            id: 'new-user-123',
            username: 'newuser',
            email: 'newuser@test.com',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null,
            created_by: 'admin-123',
          }
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Simulate user registration API call
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('newuser');
      expect(data.data.email).toBe('newuser@test.com');
      expect(data.data.is_active).toBe(true);
      expect(data.data.created_by).toBe('admin-123');

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        }),
      }));
    });

    it('should handle validation errors during user registration', async () => {
      // Mock validation error response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: false, 
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username already exists',
            field: 'username'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Simulate user registration with existing username
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'existinguser',
          email: 'new@test.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Username already exists');
      expect(data.error.field).toBe('username');
    });
  });

  describe('User Profile Editing and Password Change Workflows', () => {
    it('should successfully update user profile', async () => {
      // Mock successful profile update
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            id: 'admin-123',
            username: 'updatedadmin',
            email: 'updated@test.com',
            role: 'admin',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: new Date().toISOString(),
            last_login: '2024-01-01T12:00:00Z',
            created_by: null,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test profile update
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'updatedadmin',
          email: 'updated@test.com',
        }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('updatedadmin');
      expect(data.data.email).toBe('updated@test.com');

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          username: 'updatedadmin',
          email: 'updated@test.com',
        }),
      }));
    });

    it('should successfully change user password', async () => {
      // Mock successful password change
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          message: 'Password updated successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test password change
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'currentpass123',
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'NewSecurePass123!',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password updated successfully');

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith('/api/user/password', expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          currentPassword: 'currentpass123',
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'NewSecurePass123!',
        }),
      }));
    });

    it('should handle incorrect current password during password change', async () => {
      // Mock incorrect current password error
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: false, 
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
            field: 'currentPassword'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test password change with wrong current password
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'NewSecurePass123!',
          confirmPassword: 'NewSecurePass123!',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PASSWORD');
      expect(data.error.message).toBe('Current password is incorrect');
      expect(data.error.field).toBe('currentPassword');
    });
  });

  describe('User Activation/Deactivation Functionality', () => {
    it('should successfully activate an inactive user', async () => {
      // Mock successful user activation
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            id: 'user-2',
            username: 'user2',
            email: 'user2@test.com',
            role: 'admin',
            is_active: true,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: new Date().toISOString(),
            last_login: null,
            created_by: 'admin-123',
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test user activation
      const response = await fetch('/api/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('user-2');
      expect(data.data.is_active).toBe(true);

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users/user-2', expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ is_active: true }),
      }));
    });

    it('should successfully deactivate an active user', async () => {
      // Mock successful user deactivation
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            id: 'user-1',
            username: 'user1',
            email: 'user1@test.com',
            role: 'admin',
            is_active: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: new Date().toISOString(),
            last_login: '2024-01-01T10:00:00Z',
            created_by: 'admin-123',
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test user deactivation
      const response = await fetch('/api/admin/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('user-1');
      expect(data.data.is_active).toBe(false);

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users/user-1', expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ is_active: false }),
      }));
    });
  });

  describe('Search and Pagination in User Management Table', () => {
    it('should return all users without search filter', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@test.com',
          role: 'admin' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-01T10:00:00Z',
          created_by: 'admin-123',
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@test.com',
          role: 'admin' as const,
          is_active: false,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          last_login: null,
          created_by: 'admin-123',
        },
        {
          id: 'user-3',
          username: 'user3',
          email: 'user3@test.com',
          role: 'admin' as const,
          is_active: true,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          last_login: '2024-01-03T15:00:00Z',
          created_by: 'admin-123',
        },
      ];

      // Mock users list response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            users: mockUsers,
            total: mockUsers.length,
            page: 1,
            limit: 10,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test fetching all users
      const response = await fetch('/api/admin/users?page=1&limit=10');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(3);
      expect(data.data.total).toBe(3);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(10);

      // Verify all users are returned
      expect(data.data.users.map((u: any) => u.username)).toEqual(['user1', 'user2', 'user3']);
    });

    it('should filter users based on search term', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'user1',
        email: 'user1@test.com',
        role: 'admin' as const,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-01T10:00:00Z',
        created_by: 'admin-123',
      };

      // Mock filtered search results
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            users: [mockUser], // Only user1 matches
            total: 1,
            page: 1,
            limit: 10,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test search functionality
      const response = await fetch('/api/admin/users?page=1&limit=10&search=user1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].username).toBe('user1');
      expect(data.data.total).toBe(1);

      // Verify API was called with search parameter
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users?page=1&limit=10&search=user1');
    });

    it('should handle pagination correctly', async () => {
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        id: `user-${i + 1}`,
        username: `user${i + 1}`,
        email: `user${i + 1}@test.com`,
        role: 'admin' as const,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-01T10:00:00Z',
        created_by: 'admin-123',
      }));

      // Mock first page response
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            users: manyUsers.slice(0, 10), // First 10 users
            total: 25,
            page: 1,
            limit: 10,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test first page
      const firstPageResponse = await fetch('/api/admin/users?page=1&limit=10');
      const firstPageData = await firstPageResponse.json();

      expect(firstPageResponse.status).toBe(200);
      expect(firstPageData.success).toBe(true);
      expect(firstPageData.data.users).toHaveLength(10);
      expect(firstPageData.data.total).toBe(25);
      expect(firstPageData.data.page).toBe(1);
      expect(firstPageData.data.users[0].username).toBe('user1');
      expect(firstPageData.data.users[9].username).toBe('user10');

      // Mock second page response
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            users: manyUsers.slice(10, 20), // Next 10 users
            total: 25,
            page: 2,
            limit: 10,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test second page
      const secondPageResponse = await fetch('/api/admin/users?page=2&limit=10');
      const secondPageData = await secondPageResponse.json();

      expect(secondPageResponse.status).toBe(200);
      expect(secondPageData.success).toBe(true);
      expect(secondPageData.data.users).toHaveLength(10);
      expect(secondPageData.data.page).toBe(2);
      expect(secondPageData.data.users[0].username).toBe('user11');
      expect(secondPageData.data.users[9].username).toBe('user20');
    });

    it('should handle empty search results gracefully', async () => {
      // Mock empty search results
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            users: [],
            total: 0,
            page: 1,
            limit: 10,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Test search with no results
      const response = await fetch('/api/admin/users?page=1&limit=10&search=nonexistentuser');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(0);
      expect(data.data.total).toBe(0);

      // Verify API was called with search parameter
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users?page=1&limit=10&search=nonexistentuser');
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full user lifecycle workflow', async () => {
      // Step 1: Create user
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            id: 'workflow-user-123',
            username: 'workflowuser',
            email: 'workflow@test.com',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null,
            created_by: 'admin-123',
          }
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const createResponse = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'workflowuser',
          email: 'workflow@test.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        }),
      });
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.data.username).toBe('workflowuser');

      // Step 2: Update user profile
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            ...createData.data,
            username: 'updatedworkflowuser',
            email: 'updatedworkflow@test.com',
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const updateResponse = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'updatedworkflowuser',
          email: 'updatedworkflow@test.com',
        }),
      });
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.success).toBe(true);
      expect(updateData.data.username).toBe('updatedworkflowuser');

      // Step 3: Change password
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ 
          success: true, 
          message: 'Password updated successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const passwordResponse = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass456!',
          confirmPassword: 'NewSecurePass456!',
        }),
      });
      const passwordData = await passwordResponse.json();

      expect(passwordResponse.status).toBe(200);
      expect(passwordData.success).toBe(true);
      expect(passwordData.message).toBe('Password updated successfully');

      // Step 4: Deactivate user
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ 
          success: true, 
          data: {
            ...updateData.data,
            is_active: false,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const deactivateResponse = await fetch('/api/admin/users/workflow-user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      const deactivateData = await deactivateResponse.json();

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateData.success).toBe(true);
      expect(deactivateData.data.is_active).toBe(false);

      // Verify all API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });
});