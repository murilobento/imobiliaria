import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PasswordChangeForm from '../PasswordChangeForm';

// Mock the ErrorProvider
vi.mock('@/components/admin/Common/ErrorProvider', () => ({
  useErrorContext: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn()
  })
}));

// Mock the validation utilities
vi.mock('@/lib/utils/validation', () => ({
  validatePasswordStrength: vi.fn((password: string) => {
    const errors = [];
    if (password.length < 8) {
      errors.push({ field: 'password', message: 'A senha deve ter pelo menos 8 caracteres', code: 'PASSWORD_TOO_SHORT' });
    }
    if (!/[a-z]/.test(password)) {
      errors.push({ field: 'password', message: 'A senha deve conter pelo menos uma letra minúscula', code: 'PASSWORD_NO_LOWERCASE' });
    }
    if (!/[A-Z]/.test(password)) {
      errors.push({ field: 'password', message: 'A senha deve conter pelo menos uma letra maiúscula', code: 'PASSWORD_NO_UPPERCASE' });
    }
    if (!/\d/.test(password)) {
      errors.push({ field: 'password', message: 'A senha deve conter pelo menos um número', code: 'PASSWORD_NO_NUMBER' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push({ field: 'password', message: 'A senha deve conter pelo menos um caractere especial', code: 'PASSWORD_NO_SPECIAL' });
    }
    return errors;
  }),
  sanitizeInput: vi.fn((input) => input)
}));

// Mock the form validation hook
vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: vi.fn(() => ({
    fields: {
      currentPassword: { value: '', error: undefined, touched: false, valid: true },
      newPassword: { value: '', error: undefined, touched: false, valid: true },
      confirmPassword: { value: '', error: undefined, touched: false, valid: true }
    },
    isValid: false,
    isDirty: false,
    setFieldValue: vi.fn(),
    setFieldErrors: vi.fn(),
    validateAllFields: vi.fn(() => true),
    getValues: vi.fn(() => ({
      currentPassword: 'currentPass123!',
      newPassword: 'NewPass123!',
      confirmPassword: 'NewPass123!'
    })),
    hasFieldError: vi.fn(() => false),
    getFieldError: vi.fn(() => undefined),
    resetForm: vi.fn()
  }))
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PasswordChangeForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <PasswordChangeForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  it('renders password change form with all required fields', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /alterar senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nova senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar nova senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /alterar senha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('displays password requirements information', () => {
    renderComponent();

    expect(screen.getByText('Critérios de segurança para a nova senha:')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos uma letra minúscula')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos uma letra maiúscula')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos um número')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos um caractere especial (!@#$%^&*)')).toBeInTheDocument();
    expect(screen.getByText('Diferente da senha atual')).toBeInTheDocument();
  });

  it('toggles password visibility when eye icons are clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentPasswordInput = screen.getByLabelText(/senha atual/i);
    const newPasswordInput = screen.getByLabelText(/^nova senha \*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar nova senha/i);

    // Initially passwords should be hidden
    expect(currentPasswordInput).toHaveAttribute('type', 'password');
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Click eye icons to show passwords
    const eyeButtons = screen.getAllByRole('button');
    const eyeButtonsForPasswords = eyeButtons.filter(button => 
      button.querySelector('svg') && !button.textContent?.includes('Alterar') && !button.textContent?.includes('Cancelar')
    );

    await user.click(eyeButtonsForPasswords[0]); // Current password
    await user.click(eyeButtonsForPasswords[1]); // New password
    await user.click(eyeButtonsForPasswords[2]); // Confirm password

    expect(currentPasswordInput).toHaveAttribute('type', 'text');
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });

  it('shows password strength validation errors for weak passwords', async () => {
    const user = userEvent.setup();
    
    // Mock the hook to return a weak password
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'current123', error: undefined, touched: false, valid: true },
        newPassword: { value: 'weak', error: undefined, touched: true, valid: false },
        confirmPassword: { value: 'weak', error: undefined, touched: false, valid: true }
      },
      isValid: false,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: vi.fn(),
      validateAllFields: vi.fn(() => false),
      getValues: vi.fn(() => ({
        currentPassword: 'current123',
        newPassword: 'weak',
        confirmPassword: 'weak'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: vi.fn()
    });

    renderComponent();

    // Should show password strength validation errors
    expect(screen.getByText('A senha deve atender aos seguintes critérios:')).toBeInTheDocument();
    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres')).toBeInTheDocument();
  });

  it('shows success message when passwords match and are strong', async () => {
    // Mock the hook to return strong matching passwords
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'Current123!', error: undefined, touched: true, valid: true },
        newPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true },
        confirmPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true }
      },
      isValid: true,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: vi.fn(),
      validateAllFields: vi.fn(() => true),
      getValues: vi.fn(() => ({
        currentPassword: 'Current123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: vi.fn()
    });

    renderComponent();

    expect(screen.getByText('Senha atende aos critérios de segurança')).toBeInTheDocument();
    expect(screen.getByText('Senhas coincidem')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    // Mock the hook to return non-matching passwords
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'Current123!', error: undefined, touched: true, valid: true },
        newPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true },
        confirmPassword: { value: 'DifferentPass123!', error: undefined, touched: true, valid: true }
      },
      isValid: true,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: vi.fn(),
      validateAllFields: vi.fn(() => true),
      getValues: vi.fn(() => ({
        currentPassword: 'Current123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: vi.fn()
    });

    renderComponent();

    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('submits form successfully with valid data', async () => {
    const user = userEvent.setup();
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Senha alterada com sucesso'
      })
    });

    // Mock the hook to return valid form data
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    const mockResetForm = vi.fn();
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'Current123!', error: undefined, touched: true, valid: true },
        newPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true },
        confirmPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true }
      },
      isValid: true,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: vi.fn(),
      validateAllFields: vi.fn(() => true),
      getValues: vi.fn(() => ({
        currentPassword: 'Current123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: mockResetForm
    });

    renderComponent();

    const submitButton = screen.getByRole('button', { name: /alterar senha/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/user/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          currentPassword: 'Current123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });
    });

    expect(mockResetForm).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles API error for incorrect current password', async () => {
    const user = userEvent.setup();
    
    // Mock API error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Senha atual incorreta',
          field: 'currentPassword'
        }
      })
    });

    // Mock the hook to return valid form data
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    const mockSetFieldErrors = vi.fn();
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'WrongPass123!', error: undefined, touched: true, valid: true },
        newPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true },
        confirmPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true }
      },
      isValid: true,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: mockSetFieldErrors,
      validateAllFields: vi.fn(() => true),
      getValues: vi.fn(() => ({
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: vi.fn()
    });

    renderComponent();

    const submitButton = screen.getByRole('button', { name: /alterar senha/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetFieldErrors).toHaveBeenCalledWith({
        currentPassword: ['Senha atual incorreta']
      });
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('prevents submission when new password is same as current password', async () => {
    const user = userEvent.setup();
    
    // Mock the hook to return same passwords
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    const mockSetFieldErrors = vi.fn();
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'SamePass123!', error: undefined, touched: true, valid: true },
        newPassword: { value: 'SamePass123!', error: undefined, touched: true, valid: true },
        confirmPassword: { value: 'SamePass123!', error: undefined, touched: true, valid: true }
      },
      isValid: true,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: mockSetFieldErrors,
      validateAllFields: vi.fn(() => true),
      getValues: vi.fn(() => ({
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        confirmPassword: 'SamePass123!'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: vi.fn()
    });

    renderComponent();

    const submitButton = screen.getByRole('button', { name: /alterar senha/i });
    await user.click(submitButton);

    expect(mockSetFieldErrors).toHaveBeenCalledWith({
      newPassword: ['A nova senha deve ser diferente da senha atual']
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('disables form when loading', () => {
    renderComponent({ isLoading: true });

    const currentPasswordInput = screen.getByLabelText(/senha atual/i);
    const newPasswordInput = screen.getByLabelText(/^nova senha \*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar nova senha/i);
    const submitButton = screen.getByRole('button', { name: /alterando/i });
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });

    expect(currentPasswordInput).toBeDisabled();
    expect(newPasswordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Mock the hook to return valid form data
    const { useFormValidation } = await import('@/hooks/useFormValidation');
    vi.mocked(useFormValidation).mockReturnValue({
      fields: {
        currentPassword: { value: 'Current123!', error: undefined, touched: true, valid: true },
        newPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true },
        confirmPassword: { value: 'NewPass123!', error: undefined, touched: true, valid: true }
      },
      isValid: true,
      isDirty: true,
      setFieldValue: vi.fn(),
      setFieldErrors: vi.fn(),
      validateAllFields: vi.fn(() => true),
      getValues: vi.fn(() => ({
        currentPassword: 'Current123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      })),
      hasFieldError: vi.fn(() => false),
      getFieldError: vi.fn(() => undefined),
      resetForm: vi.fn()
    });

    renderComponent();

    const submitButton = screen.getByRole('button', { name: /alterar senha/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});