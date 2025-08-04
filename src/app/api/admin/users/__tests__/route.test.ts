/**
 * Comprehensive tests for Admin User Management API endpoints
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { GET as GET_USER, PATCH } from '../[id]/route';

// Mock dependencies
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/database');
vi.mock('@/lib/auth/rateLimitMiddleware');
vi.mock('@/lib/auth/securityLogger');
vi.mock('@/lib/utils/validation');
vi.mock('@/lib/auth/rateLimit');

const mockVerifyJWTToken = vi.fn();
const mockGetUsersList = vi.fn();
const mockCreateUser = vi.fn();
const mockCheckUsernameAvailability = vi.fn();
const mockCheckEmailAvailability = vi.fn();
const mockGetUserById = vi.fn();
const mockToggleUserStatus = vi.fn();
const mockRateLimitMiddleware = vi.fn();
const mockLogSecurityEvent = vi.fn();
const mockValidateCreateUser = vi.fn();
const mockSanitizeInput = vi.fn();
const mockGetClientIp = vi.fn();

// Setup mocks
vi.mocked(await import('@/lib/auth/jwt')).verifyJWTToken = mockVerifyJWTToken;
vi.mocked(await import('@/lib/auth/database')).getUsersList = mockGetUsersList;
vi.mocked(await import('@/lib/auth/database')).createUser = mockCreateUser;
vi.mocked(await import('@/lib/auth/database')).checkUsernameAvailability = mockCheckUsernameAvailability;
vi.mocked(await import('@/lib/auth/database')).checkEmailAvailability = mockCheckEmailAvailability;
vi.mocked(await import('@/lib/auth/database')).getUserById = mockGetUserById;
vi.mocked(await import('@/lib/auth/database')).toggleUserStatus = mockToggleUserStatus;
vi.mocked(await import('@/lib/auth/rateLimitMiddleware')).rateLimitMiddleware = mockRateLimitMiddleware;
vi.mocked(await import('@/lib/auth/securityLogger')).logSecurityEvent = mockLogSecurityEvent;
vi.mocked(await import('@/lib/utils/validation')).validateCreateUser = mockValidateCreateUser;
vi.mocked(await import('@/lib/utils/validation')).sanitizeInput = mockSanitizeInput;
vi.mocked(await import('@/lib/auth/rateLimit')).getClientIp = mockGetClientIp;

describe('/api/admin/users', () => {
  const mockAdminPayload = {
    sub: 'admin-123',
    username: 'admin',
    role: 'admin',
    iat: 1234567890,
    exp: 1234567890 + 3600
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_login: null,
    created_by: 'admin-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockLogSecurityEvent.mockResolvedValue(undefined);
  });

  describe('GET /api/admin/users', () => {
    it('should reject unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No authentication token provided');
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unauthorized_access'
        })
      );
    });

    it('should reject requests with invalid token', async () => {
      mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer invalid-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid authentication token');
    });

    it('should reject requests with expired token', async () => {
      mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_EXPIRED'));

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer expired-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Token has expired');
    });

    it('should reject non-admin users', async () => {
      mockVerifyJWTToken.mockResolvedValue({
        ...mockAdminPayload,
        role: 'user'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer user-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should return users list for authenticated admin', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUsersList.mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.total).toBe(1);
      expect(mockGetUsersList).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should handle pagination parameters', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUsersList.mockResolvedValue({
        users: [],
        total: 0,
        page: 2,
        limit: 25
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users?page=2&limit=25', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetUsersList).toHaveBeenCalledWith(2, 25, undefined);
    });

    it('should handle search parameter', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUsersList.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 10
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users?search=test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET(request);

      expect(mockGetUsersList).toHaveBeenCalledWith(1, 10, 'test');
    });

    it('should validate pagination parameters', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);

      const request = new NextRequest('http://localhost:3000/api/admin/users?page=0&limit=0', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Page must be greater than 0');
    });

    it('should limit maximum page size', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUsersList.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 50
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users?limit=100', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET(request);

      expect(mockGetUsersList).toHaveBeenCalledWith(1, 50, undefined);
    });

    it('should handle database errors', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUsersList.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/admin/users', () => {
    beforeEach(() => {
      mockRateLimitMiddleware.mockResolvedValue({ success: true });
      mockSanitizeInput.mockImplementation((data) => data);
      mockValidateCreateUser.mockReturnValue({ isValid: true, errors: [] });
      mockCheckUsernameAvailability.mockResolvedValue(true);
      mockCheckEmailAvailability.mockResolvedValue(true);
    });

    it('should reject unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'test',
          email: 'test@example.com',
          password: 'password'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No authentication token provided');
    });

    it('should handle rate limiting', async () => {
      mockRateLimitMiddleware.mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded'
        }), { status: 429 })
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'test',
          email: 'test@example.com',
          password: 'password'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
    });

    it('should create user successfully', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockCreateUser.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUser);
      expect(data.message).toBe('User created successfully');
      expect(mockCreateUser).toHaveBeenCalledWith(
        {
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!'
        },
        'admin-123'
      );
    });

    it('should reject invalid JSON', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should reject when username already exists', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockCheckUsernameAvailability.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'existinguser',
          email: 'test@example.com',
          password: 'TestPass123!'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Username already exists');
      expect(data.field).toBe('username');
    });

    it('should reject when email already exists', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockCheckEmailAvailability.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'existing@example.com',
          password: 'TestPass123!'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email already exists');
      expect(data.field).toBe('email');
    });

    it('should reject invalid user data', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockValidateCreateUser.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'password', message: 'Password too weak', code: 'WEAK_PASSWORD' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.errors).toHaveLength(1);
    });

    it('should handle database errors during user creation', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockCreateUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET /api/admin/users/[id]', () => {
    it('should reject invalid UUID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/invalid-id', {
        method: 'GET'
      });

      const response = await GET_USER(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid user ID format');
    });

    it('should return user data for valid request', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET_USER(request, { params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockGetUserById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin-token'
        }
      });

      const response = await GET_USER(request, { params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PATCH /api/admin/users/[id]', () => {
    it('should toggle user status successfully', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);
      mockToggleUserStatus.mockResolvedValue({
        ...mockUser,
        is_active: false
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ is_active: false })
      });

      const response = await PATCH(request, { params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_active).toBe(false);
      expect(mockToggleUserStatus).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', false);
    });

    it('should reject invalid status value', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockAdminPayload);

      const request = new NextRequest('http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ is_active: 'invalid' })
      });

      const response = await PATCH(request, { params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid is_active value. Must be boolean.');
    });
  });
});