import { describe, it, expect } from 'vitest';
import {
  validateCreateUser,
  validateUpdateProfile,
  validateChangePassword,
  validatePasswordStrength,
  validateUsernameFormat,
  validateEmailFormat,
  checkUsernameUniqueness,
  checkEmailUniqueness
} from '../validation';

describe('User Management Validation', () => {
  describe('validateCreateUser', () => {
    it('should validate valid user creation data', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      };

      const result = validateCreateUser(userData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when required fields are missing', () => {
      const userData = {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      };

      const result = validateCreateUser(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'username' && e.code === 'REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.field === 'password' && e.code === 'REQUIRED')).toBe(true);
    });

    it('should reject when passwords do not match', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        confirmPassword: 'DifferentPass123!'
      };

      const result = validateCreateUser(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'confirmPassword' && e.code === 'PASSWORDS_DONT_MATCH')).toBe(true);
    });

    it('should reject weak passwords', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      };

      const result = validateCreateUser(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'password' && e.code === 'PASSWORD_TOO_SHORT')).toBe(true);
    });

    it('should reject when username already exists', () => {
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      };

      const existingUsernames = ['existinguser', 'anotheruser'];
      const result = validateCreateUser(userData, existingUsernames);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'username' && e.code === 'NOT_UNIQUE')).toBe(true);
    });

    it('should reject when email already exists', () => {
      const userData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      };

      const existingEmails = ['existing@example.com', 'another@example.com'];
      const result = validateCreateUser(userData, [], existingEmails);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'NOT_UNIQUE')).toBe(true);
    });

    it('should reject invalid email format', () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      };

      const result = validateCreateUser(userData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_EMAIL')).toBe(true);
    });
  });

  describe('validateUpdateProfile', () => {
    it('should validate valid profile update data', () => {
      const updateData = {
        username: 'newusername',
        email: 'newemail@example.com'
      };

      const result = validateUpdateProfile(updateData, 'current-user-id');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial updates', () => {
      const updateData = {
        username: 'newusername'
      };

      const result = validateUpdateProfile(updateData, 'current-user-id');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const updateData = {
        email: 'invalid-email'
      };

      const result = validateUpdateProfile(updateData, 'current-user-id');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_EMAIL')).toBe(true);
    });

    it('should reject when username already exists', () => {
      const updateData = {
        username: 'existinguser'
      };

      const existingUsernames = ['existinguser'];
      const result = validateUpdateProfile(updateData, 'current-user-id', existingUsernames);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'username' && e.code === 'NOT_UNIQUE')).toBe(true);
    });

    it('should reject when email already exists', () => {
      const updateData = {
        email: 'existing@example.com'
      };

      const existingEmails = ['existing@example.com'];
      const result = validateUpdateProfile(updateData, 'current-user-id', [], existingEmails);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'NOT_UNIQUE')).toBe(true);
    });
  });

  describe('validateChangePassword', () => {
    it('should validate valid password change data', () => {
      const passwordData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      };

      const result = validateChangePassword(passwordData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when required fields are missing', () => {
      const passwordData = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };

      const result = validateChangePassword(passwordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'currentPassword' && e.code === 'REQUIRED')).toBe(true);
      expect(result.errors.some(e => e.field === 'newPassword' && e.code === 'REQUIRED')).toBe(true);
    });

    it('should reject when new passwords do not match', () => {
      const passwordData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!'
      };

      const result = validateChangePassword(passwordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'confirmPassword' && e.code === 'PASSWORDS_DONT_MATCH')).toBe(true);
    });

    it('should reject weak new password', () => {
      const passwordData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'weak',
        confirmPassword: 'weak'
      };

      const result = validateChangePassword(passwordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'newPassword' && e.code === 'PASSWORD_TOO_SHORT')).toBe(true);
    });

    it('should reject when new password is same as current', () => {
      const passwordData = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        confirmPassword: 'SamePass123!'
      };

      const result = validateChangePassword(passwordData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'newPassword' && e.code === 'SAME_PASSWORD')).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const errors = validatePasswordStrength('StrongPass123!');
      expect(errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const errors = validatePasswordStrength('Short1!');
      expect(errors.some(e => e.code === 'PASSWORD_TOO_SHORT')).toBe(true);
    });

    it('should reject password without lowercase letter', () => {
      const errors = validatePasswordStrength('UPPERCASE123!');
      expect(errors.some(e => e.code === 'PASSWORD_NO_LOWERCASE')).toBe(true);
    });

    it('should reject password without uppercase letter', () => {
      const errors = validatePasswordStrength('lowercase123!');
      expect(errors.some(e => e.code === 'PASSWORD_NO_UPPERCASE')).toBe(true);
    });

    it('should reject password without number', () => {
      const errors = validatePasswordStrength('NoNumbers!');
      expect(errors.some(e => e.code === 'PASSWORD_NO_NUMBER')).toBe(true);
    });

    it('should reject password without special character', () => {
      const errors = validatePasswordStrength('NoSpecial123');
      expect(errors.some(e => e.code === 'PASSWORD_NO_SPECIAL')).toBe(true);
    });

    it('should handle empty password', () => {
      const errors = validatePasswordStrength('');
      expect(errors).toHaveLength(0); // Empty handled by required validation
    });

    it('should accumulate multiple errors', () => {
      const errors = validatePasswordStrength('weak');
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(e => e.code === 'PASSWORD_TOO_SHORT')).toBe(true);
      expect(errors.some(e => e.code === 'PASSWORD_NO_UPPERCASE')).toBe(true);
      expect(errors.some(e => e.code === 'PASSWORD_NO_NUMBER')).toBe(true);
      expect(errors.some(e => e.code === 'PASSWORD_NO_SPECIAL')).toBe(true);
    });
  });

  describe('validateUsernameFormat', () => {
    it('should accept valid usernames', () => {
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
      expect(validateUsernameFormat('_username').some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
      expect(validateUsernameFormat('-username').some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
    });

    it('should reject username ending with underscore or hyphen', () => {
      expect(validateUsernameFormat('username_').some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
      expect(validateUsernameFormat('username-').some(e => e.code === 'INVALID_USERNAME_BOUNDARIES')).toBe(true);
    });

    it('should reject username with consecutive special characters', () => {
      expect(validateUsernameFormat('user__name').some(e => e.code === 'INVALID_USERNAME_CONSECUTIVE')).toBe(true);
      expect(validateUsernameFormat('user--name').some(e => e.code === 'INVALID_USERNAME_CONSECUTIVE')).toBe(true);
      expect(validateUsernameFormat('user_-name').some(e => e.code === 'INVALID_USERNAME_CONSECUTIVE')).toBe(true);
    });

    it('should handle empty username', () => {
      const errors = validateUsernameFormat('');
      expect(errors).toHaveLength(0); // Empty handled by required validation
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
      expect(validateEmailFormat('user@')).toBe(false);
      expect(validateEmailFormat('@domain.com')).toBe(false);
      expect(validateEmailFormat('user@domain')).toBe(false);
      expect(validateEmailFormat('')).toBe(false);
    });
  });

  describe('checkUsernameUniqueness', () => {
    it('should return true for unique username', () => {
      const existingUsernames = ['user1', 'user2', 'user3'];
      expect(checkUsernameUniqueness('newuser', existingUsernames)).toBe(true);
    });

    it('should return false for existing username', () => {
      const existingUsernames = ['user1', 'user2', 'user3'];
      expect(checkUsernameUniqueness('user2', existingUsernames)).toBe(false);
    });

    it('should handle empty existing usernames array', () => {
      expect(checkUsernameUniqueness('anyuser', [])).toBe(true);
    });
  });

  describe('checkEmailUniqueness', () => {
    it('should return true for unique email', () => {
      const existingEmails = ['user1@example.com', 'user2@example.com'];
      expect(checkEmailUniqueness('new@example.com', existingEmails)).toBe(true);
    });

    it('should return false for existing email', () => {
      const existingEmails = ['user1@example.com', 'user2@example.com'];
      expect(checkEmailUniqueness('user1@example.com', existingEmails)).toBe(false);
    });

    it('should handle empty existing emails array', () => {
      expect(checkEmailUniqueness('any@example.com', [])).toBe(true);
    });
  });
});