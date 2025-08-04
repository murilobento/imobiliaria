import { describe, it, expect } from 'vitest';
import {
  validateCreateUser,
  validateUpdateProfile,
  validateChangePassword,
  validatePasswordStrength,
  validateEmailFormat,
  validateUsernameFormat,
  checkUsernameUniqueness,
  checkEmailUniqueness
} from '@/lib/utils/validation';
import type {
  User,
  CreateUserRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserListResponse,
  UserManagementResponse
} from '@/types/auth';

describe('User Management Types', () => {
  describe('Type Definitions', () => {
    it('should have correct User interface structure', () => {
      const user: User = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: null
      };

      expect(user.id).toBe('123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('admin');
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBe('2024-01-01T00:00:00Z');
      expect(user.updated_at).toBe('2024-01-01T00:00:00Z');
      expect(user.last_login).toBeNull();
      expect(user.created_by).toBeNull();
    });

    it('should have correct CreateUserRequest interface structure', () => {
      const request: CreateUserRequest = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      expect(request.username).toBe('newuser');
      expect(request.email).toBe('new@example.com');
      expect(request.password).toBe('Password123!');
      expect(request.confirmPassword).toBe('Password123!');
    });

    it('should have correct UpdateProfileRequest interface structure', () => {
      const request: UpdateProfileRequest = {
        username: 'updateduser',
        email: 'updated@example.com'
      };

      expect(request.username).toBe('updateduser');
      expect(request.email).toBe('updated@example.com');
    });

    it('should have correct ChangePasswordRequest interface structure', () => {
      const request: ChangePasswordRequest = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      expect(request.currentPassword).toBe('OldPassword123!');
      expect(request.newPassword).toBe('NewPassword123!');
      expect(request.confirmPassword).toBe('NewPassword123!');
    });

    it('should have correct UserListResponse interface structure', () => {
      const response: UserListResponse = {
        users: [],
        total: 0,
        page: 1,
        limit: 10
      };

      expect(response.users).toEqual([]);
      expect(response.total).toBe(0);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);
    });

    it('should have correct UserManagementResponse interface structure', () => {
      const successResponse: UserManagementResponse<User> = {
        success: true,
        data: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: null,
          created_by: null
        }
      };

      const errorResponse: UserManagementResponse = {
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists',
          field: 'username'
        }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
    });
  });
});

describe('User Management Validation', () => {
  describe('validateCreateUser', () => {
    it('should validate valid user creation data', () => {
      const data = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      };

      const result = validateCreateUser(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject user creation with missing required fields', () => {
      const data = {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      };

      const result = validateCreateUser(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'username' && e.code === 'REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.field === 'password' && e.code === 'REQUIRED')).toBe(true);
    });

    it('should reject user creation with mismatched passwords', () => {
      const data = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'DifferentPass123!'
      };

      const result = validateCreateUser(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'confirmPassword' && e.code === 'PASSWORDS_DONT_MATCH')).toBe(true);
    });

    it('should reject user creation with existing username', () => {
      const data = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      };

      const result = validateCreateUser(data, ['existinguser'], []);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'username' && e.code === 'NOT_UNIQUE')).toBe(true);
    });

    it('should reject user creation with existing email', () => {
      const data = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      };

      const result = validateCreateUser(data, [], ['existing@example.com']);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'NOT_UNIQUE')).toBe(true);
    });

    it('should reject user creation with weak password', () => {
      const data = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      };

      const result = validateCreateUser(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'password')).toBe(true);
    });
  });

  describe('validateUpdateProfile', () => {
    it('should validate valid profile update data', () => {
      const data = {
        username: 'updateduser',
        email: 'updated@example.com'
      };

      const result = validateUpdateProfile(data, 'user123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty profile update data', () => {
      const data = {};

      const result = validateUpdateProfile(data, 'user123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'invalid-email'
      };

      const result = validateUpdateProfile(data, 'user123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_EMAIL')).toBe(true);
    });

    it('should reject invalid username format', () => {
      const data = {
        username: 'invalid username!'
      };

      const result = validateUpdateProfile(data, 'user123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'username' && e.code === 'INVALID_PATTERN')).toBe(true);
    });
  });

  describe('validateChangePassword', () => {
    it('should validate valid password change data', () => {
      const data = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      };

      const result = validateChangePassword(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password change with missing fields', () => {
      const data = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };

      const result = validateChangePassword(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'currentPassword' && e.code === 'REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.field === 'newPassword' && e.code === 'REQUIRED')).toBe(true);
    });

    it('should reject password change with mismatched new passwords', () => {
      const data = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!'
      };

      const result = validateChangePassword(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'confirmPassword' && e.code === 'PASSWORDS_DONT_MATCH')).toBe(true);
    });

    it('should reject password change when new password equals current password', () => {
      const data = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        confirmPassword: 'SamePass123!'
      };

      const result = validateChangePassword(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'newPassword' && e.code === 'SAME_PASSWORD')).toBe(true);
    });

    it('should reject password change with weak new password', () => {
      const data = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'weak',
        confirmPassword: 'weak'
      };

      const result = validateChangePassword(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'newPassword')).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const errors = validatePasswordStrength('StrongPass123!');
      expect(errors).toHaveLength(0);
    });

    it('should reject password without lowercase letter', () => {
      const errors = validatePasswordStrength('STRONGPASS123!');
      expect(errors.some(e => e.code === 'PASSWORD_NO_LOWERCASE')).toBe(true);
    });

    it('should reject password without uppercase letter', () => {
      const errors = validatePasswordStrength('strongpass123!');
      expect(errors.some(e => e.code === 'PASSWORD_NO_UPPERCASE')).toBe(true);
    });

    it('should reject password without number', () => {
      const errors = validatePasswordStrength('StrongPass!');
      expect(errors.some(e => e.code === 'PASSWORD_NO_NUMBER')).toBe(true);
    });

    it('should reject password without special character', () => {
      const errors = validatePasswordStrength('StrongPass123');
      expect(errors.some(e => e.code === 'PASSWORD_NO_SPECIAL')).toBe(true);
    });

    it('should reject password that is too short', () => {
      const errors = validatePasswordStrength('Short1!');
      expect(errors.some(e => e.code === 'PASSWORD_TOO_SHORT')).toBe(true);
    });

    it('should handle empty password', () => {
      const errors = validatePasswordStrength('');
      expect(errors).toHaveLength(0); // Empty passwords are handled by required field validation
    });
  });

  describe('validateEmailFormat', () => {
    it('should accept valid email formats', () => {
      expect(validateEmailFormat('test@example.com')).toBe(true);
      expect(validateEmailFormat('user.name@domain.co.uk')).toBe(true);
      expect(validateEmailFormat('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmailFormat('invalid-email')).toBe(false);
      expect(validateEmailFormat('test@')).toBe(false);
      expect(validateEmailFormat('@example.com')).toBe(false);
      expect(validateEmailFormat('test.example.com')).toBe(false);
      expect(validateEmailFormat('')).toBe(false);
    });
  });

  describe('validateUsernameFormat', () => {
    it('should accept valid username formats', () => {
      expect(validateUsernameFormat('validuser')).toHaveLength(0);
      expect(validateUsernameFormat('user123')).toHaveLength(0);
      expect(validateUsernameFormat('user_name')).toHaveLength(0);
      expect(validateUsernameFormat('user-name')).toHaveLength(0);
      expect(validateUsernameFormat('User123')).toHaveLength(0);
    });

    it('should reject username with invalid characters', () => {
      const errors = validateUsernameFormat('user@name');
      expect(errors.some(e => e.code === 'INVALID_USERNAME_FORMAT')).toBe(true);
    });

    it('should reject username starting with underscore or hyphen', () => {
      const errors1 = validateUsernameFormat('_username');
      const errors2 = validateUsernameFormat('-username');
      expect(errors1.some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
      expect(errors2.some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
    });

    it('should reject username ending with underscore or hyphen', () => {
      const errors1 = validateUsernameFormat('username_');
      const errors2 = validateUsernameFormat('username-');
      expect(errors1.some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
      expect(errors2.some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
    });

    it('should reject username with consecutive special characters', () => {
      const errors1 = validateUsernameFormat('user__name');
      const errors2 = validateUsernameFormat('user--name');
      expect(errors1.some(e => e.code === 'INVALID_USERNAME_CONSECUTIVE')).toBe(true);
      expect(errors2.some(e => e.code === 'INVALID_USERNAME_CONSECUTIVE')).toBe(true);
    });

    it('should handle empty username', () => {
      const errors = validateUsernameFormat('');
      expect(errors).toHaveLength(0); // Empty usernames are handled by required field validation
    });
  });

  describe('checkUsernameUniqueness', () => {
    it('should return true for unique username', () => {
      const result = checkUsernameUniqueness('newuser', ['existinguser1', 'existinguser2']);
      expect(result).toBe(true);
    });

    it('should return false for existing username', () => {
      const result = checkUsernameUniqueness('existinguser1', ['existinguser1', 'existinguser2']);
      expect(result).toBe(false);
    });

    it('should handle empty existing usernames array', () => {
      const result = checkUsernameUniqueness('newuser', []);
      expect(result).toBe(true);
    });
  });

  describe('checkEmailUniqueness', () => {
    it('should return true for unique email', () => {
      const result = checkEmailUniqueness('new@example.com', ['existing1@example.com', 'existing2@example.com']);
      expect(result).toBe(true);
    });

    it('should return false for existing email', () => {
      const result = checkEmailUniqueness('existing1@example.com', ['existing1@example.com', 'existing2@example.com']);
      expect(result).toBe(false);
    });

    it('should handle empty existing emails array', () => {
      const result = checkEmailUniqueness('new@example.com', []);
      expect(result).toBe(true);
    });
  });
});