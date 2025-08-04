import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '../route';
import { verifyJWTToken } from '@/lib/auth/jwt';
import { 
  getUserById, 
  updateUserProfile, 
  checkUsernameAvailability, 
  checkEmailAvailability 
} from '@/lib/auth/database';
import { validateUpdateProfile, sanitizeInput } from '@/lib/utils/validation';

// Mock the dependencies
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/database');
vi.mock('@/lib/utils/validation');

const mockVerifyJWTToken = vi.mocked(verifyJWTToken);
const mockGetUserById = vi.mocked(getUserById);
const mockUpdateUserProfile = vi.mocked(updateUserProfile);
const mockCheckUsernameAvailability = vi.mocked(checkUsernameAvailability);
const mockCheckEmailAvailability = vi.mocked(checkEmailAvailability);
const mockValidateUpdateProfile = vi.mocked(validateUpdateProfile);
const mockSanitizeInput = vi.mocked(sanitizeInput);

describe('/api/user/profile', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_login: '2024-01-01T12:00:00Z',
    created_by: null
  };

  const mockJWTPayload = {
    sub: 'user-123',
    username: 'testuser',
    role: 'admin',
    iat: 1234567890,
    exp: 1234567890 + 3600
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSanitizeInput.mockImplementation((data) => data);
    mockValidateUpdateProfile.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile data for authenticated user', async () => {
      // Setup mocks
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      // Create request with authorization header
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        headers: {
          'authorization': 'Bearer valid-token'
        }
      });

      // Call the handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        created_at: mockUser.created_at,
        last_login: mockUser.last_login
      });
      expect(mockVerifyJWTToken).toHaveBeenCalledWith('valid-token');
      expect(mockGetUserById).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when no authorization header is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid', async () => {
      mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        headers: {
          'authorization': 'Bearer invalid-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_INVALID');
    });

    it('should return 404 when user is not found', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        headers: {
          'authorization': 'Bearer valid-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 403 when user is inactive', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue({ ...mockUser, is_active: false });

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        headers: {
          'authorization': 'Bearer valid-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_INACTIVE');
    });
  });

  describe('PATCH /api/user/profile', () => {
    it('should update username successfully', async () => {
      const updatedUser = { ...mockUser, username: 'newusername' };
      
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckUsernameAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: 'newusername' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('newusername');
      expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('newusername', 'user-123');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', { username: 'newusername' });
    });

    it('should update email successfully', async () => {
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckEmailAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ email: 'newemail@example.com' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('newemail@example.com');
      expect(mockCheckEmailAvailability).toHaveBeenCalledWith('newemail@example.com', 'user-123');
    });

    it('should return 409 when username already exists', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckUsernameAvailability.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: 'existinguser' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USERNAME_EXISTS');
    });

    it('should return 409 when email already exists', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckEmailAvailability.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ email: 'existing@example.com' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 when no fields are provided for update', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NO_UPDATES');
    });

    it('should not check availability when username is not changed', async () => {
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckEmailAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ 
          username: 'testuser', // Same as current
          email: 'newemail@example.com' 
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockCheckUsernameAvailability).not.toHaveBeenCalled();
      expect(mockCheckEmailAvailability).toHaveBeenCalledWith('newemail@example.com', 'user-123');
    });

    it('should handle validation errors', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockValidateUpdateProfile.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ email: 'invalid-email' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toHaveLength(1);
    });

    it('should handle invalid JSON in request body', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: 'invalid json'
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle database errors during profile update', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckUsernameAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: 'newusername' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle duplicate key constraint errors', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckUsernameAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: 'newusername' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_DATA');
    });

    it('should sanitize input data', async () => {
      const updatedUser = { ...mockUser, username: 'newusername' };
      
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckUsernameAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockResolvedValue(updatedUser);
      mockSanitizeInput.mockReturnValue({ username: 'newusername' });

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: '  newusername  ' })
      });

      const response = await PATCH(request);

      expect(mockSanitizeInput).toHaveBeenCalledWith({ username: '  newusername  ' });
      expect(response.status).toBe(200);
    });

    it('should handle token expiration', async () => {
      mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_EXPIRED'));

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer expired-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ username: 'newusername' })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should update both username and email simultaneously', async () => {
      const updatedUser = { 
        ...mockUser, 
        username: 'newusername',
        email: 'newemail@example.com'
      };
      
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockCheckUsernameAvailability.mockResolvedValue(true);
      mockCheckEmailAvailability.mockResolvedValue(true);
      mockUpdateUserProfile.mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ 
          username: 'newusername',
          email: 'newemail@example.com'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('newusername');
      expect(data.data.email).toBe('newemail@example.com');
      expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('newusername', 'user-123');
      expect(mockCheckEmailAvailability).toHaveBeenCalledWith('newemail@example.com', 'user-123');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', { 
        username: 'newusername',
        email: 'newemail@example.com'
      });
    });
  });
});