import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { verifyJWTToken } from '@/lib/auth/jwt';
import { getUserById, changeUserPassword } from '@/lib/auth/database';
import { validateChangePassword, sanitizeInput } from '@/lib/utils/validation';

// Mock the dependencies
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/database');
vi.mock('@/lib/utils/validation');

const mockVerifyJWTToken = vi.mocked(verifyJWTToken);
const mockGetUserById = vi.mocked(getUserById);
const mockChangeUserPassword = vi.mocked(changeUserPassword);
const mockValidateChangePassword = vi.mocked(validateChangePassword);
const mockSanitizeInput = vi.mocked(sanitizeInput);

describe('/api/user/password', () => {
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
    mockValidateChangePassword.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('PATCH /api/user/password', () => {
    it('should change password successfully', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockChangeUserPassword.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Senha alterada com sucesso');
      expect(mockChangeUserPassword).toHaveBeenCalledWith('user-123', 'CurrentPass123!', 'NewPass123!');
    });

    it('should return 401 when no authorization header is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid', async () => {
      mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_INVALID'));

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer invalid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_INVALID');
    });

    it('should return 404 when user is not found', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 403 when user is inactive', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue({ ...mockUser, is_active: false });

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_INACTIVE');
    });

    it('should return 400 when required fields are missing', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          // Missing newPassword and confirmPassword
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 when passwords do not match', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockValidateChangePassword.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'confirmPassword',
            message: 'As senhas não coincidem',
            code: 'PASSWORDS_DONT_MATCH'
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'DifferentPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'confirmPassword',
            code: 'PASSWORDS_DONT_MATCH'
          })
        ])
      );
    });

    it('should return 400 when new password is weak', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockValidateChangePassword.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'newPassword',
            message: 'Senha deve ter pelo menos 8 caracteres',
            code: 'PASSWORD_TOO_SHORT'
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'weak', // Weak password
          confirmPassword: 'weak'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'newPassword',
            code: 'PASSWORD_TOO_SHORT'
          })
        ])
      );
    });

    it('should return 400 when current password is incorrect', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockChangeUserPassword.mockRejectedValue(new Error('Current password is incorrect'));

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CURRENT_PASSWORD');
      expect(data.error.field).toBe('currentPassword');
    });

    it('should return 400 when new password is same as current password', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockValidateChangePassword.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'newPassword', message: 'A nova senha deve ser diferente da senha atual', code: 'SAME_PASSWORD' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
          confirmPassword: 'SamePass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'newPassword',
            code: 'SAME_PASSWORD'
          })
        ])
      );
    });

    it('should handle invalid JSON in request body', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/password', {
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

    it('should sanitize input data', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockChangeUserPassword.mockResolvedValue();
      mockSanitizeInput.mockReturnValue({
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      });

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: '  CurrentPass123!  ',
          newPassword: '  NewPass123!  ',
          confirmPassword: '  NewPass123!  '
        })
      });

      const response = await PATCH(request);

      expect(mockSanitizeInput).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should handle token expiration', async () => {
      mockVerifyJWTToken.mockRejectedValue(new Error('TOKEN_EXPIRED'));

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer expired-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should handle database errors during password change', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockChangeUserPassword.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should validate all required fields are present', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);

      const testCases = [
        { currentPassword: '', newPassword: 'NewPass123!', confirmPassword: 'NewPass123!' },
        { currentPassword: 'CurrentPass123!', newPassword: '', confirmPassword: 'NewPass123!' },
        { currentPassword: 'CurrentPass123!', newPassword: 'NewPass123!', confirmPassword: '' },
        { newPassword: 'NewPass123!', confirmPassword: 'NewPass123!' }, // missing currentPassword
        { currentPassword: 'CurrentPass123!', confirmPassword: 'NewPass123!' }, // missing newPassword
        { currentPassword: 'CurrentPass123!', newPassword: 'NewPass123!' }, // missing confirmPassword
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/user/password', {
          method: 'PATCH',
          headers: {
            'authorization': 'Bearer valid-token',
            'content-type': 'application/json'
          },
          body: JSON.stringify(testCase)
        });

        const response = await PATCH(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('MISSING_FIELDS');
      }
    });

    it('should handle validation with multiple errors', async () => {
      mockVerifyJWTToken.mockResolvedValue(mockJWTPayload);
      mockGetUserById.mockResolvedValue(mockUser);
      mockValidateChangePassword.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'newPassword', message: 'Password too short', code: 'PASSWORD_TOO_SHORT' },
          { field: 'newPassword', message: 'Password missing uppercase', code: 'PASSWORD_NO_UPPERCASE' },
          { field: 'confirmPassword', message: 'Passwords do not match', code: 'PASSWORDS_DONT_MATCH' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'weak',
          confirmPassword: 'different'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toHaveLength(3);
    });

    it('should handle authorization header without Bearer prefix', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        headers: {
          'authorization': 'invalid-token-format',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
});