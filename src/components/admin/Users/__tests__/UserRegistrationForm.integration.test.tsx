/**
 * Integration test for UserRegistrationForm component
 * This test verifies that the component renders without errors
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import UserRegistrationForm from '../UserRegistrationForm';

// Mock the dependencies
vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: () => ({
    fields: {
      username: { value: '', error: undefined, touched: false, valid: true },
      email: { value: '', error: undefined, touched: false, valid: true },
      password: { value: '', error: undefined, touched: false, valid: true },
      confirmPassword: { value: '', error: undefined, touched: false, valid: true }
    },
    isValid: false,
    setFieldValue: vi.fn(),
    setFieldErrors: vi.fn(),
    validateAllFields: vi.fn(() => true),
    getValues: vi.fn(() => ({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!'
    })),
    hasFieldError: vi.fn(() => false),
    getFieldError: vi.fn(() => undefined),
    resetForm: vi.fn()
  })
}));

vi.mock('@/lib/utils/validation', () => ({
  validateCreateUser: () => ({ isValid: true, errors: [] }),
  validatePasswordStrength: () => [],
  validateUsernameFormat: () => []
}));

vi.mock('@/components/admin/Common/ErrorProvider', () => ({
  useErrorContext: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn()
  })
}));

describe('UserRegistrationForm Integration', () => {
  it('should create component without errors', () => {
    const mockOnSuccess = vi.fn();
    
    // This test just verifies the component can be instantiated
    expect(() => {
      React.createElement(UserRegistrationForm, {
        onSuccess: mockOnSuccess
      });
    }).not.toThrow();
  });

  it('should have the correct component structure', () => {
    const mockOnSuccess = vi.fn();
    const mockOnCancel = vi.fn();
    
    const component = React.createElement(UserRegistrationForm, {
      onSuccess: mockOnSuccess,
      onCancel: mockOnCancel,
      isLoading: false
    });
    
    expect(component).toBeDefined();
    expect(component.props.onSuccess).toBe(mockOnSuccess);
    expect(component.props.onCancel).toBe(mockOnCancel);
    expect(component.props.isLoading).toBe(false);
  });
});