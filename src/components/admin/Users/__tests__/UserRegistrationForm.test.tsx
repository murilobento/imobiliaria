import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserRegistrationForm from '../UserRegistrationForm';
import { ErrorProvider } from '../../Common/ErrorProvider';

// Mock the hooks
const mockUseFormValidation = vi.fn();
vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: mockUseFormValidation
}));

const mockValidateCreateUser = vi.fn();
const mockValidatePasswordStrength = vi.fn();
const mockValidateUsernameFormat = vi.fn();
vi.mock('@/lib/utils/validation', () => ({
  validateCreateUser: mockValidateCreateUser,
  validatePasswordStrength: mockValidatePasswordStrength,
  validateUsernameFormat: mockValidateUsernameFormat
}));

// Mock fetch
global.fetch = vi.fn();

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ErrorProvider>
      {component}
    </ErrorProvider>
  );
};

describe('UserRegistrationForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockSetFieldValue = vi.fn();
  const mockSetFieldErrors = vi.fn();
  const mockValidateAllFields = vi.fn();
  const mockGetValues = vi.fn();
  const mockResetForm = vi.fn();

  const defaultFormValidation = {
    fields: {
      username: { value: '', error: undefined, touched: false, valid: true },
      email: { value: '', error: undefined, touched: false, valid: true },
      password: { value: '', error: undefined, touched: false, valid: true },
      confirmPassword: { value: '', error: undefined, touched: false, valid: true }
    },
    isValid: false,
    setFieldValue: mockSetFieldValue,
    setFieldErrors: mockSetFieldErrors,
    validateAllFields: mockValidateAllFields,
    getValues: mockGetValues,
    hasFieldError: vi.fn(() => false),
    getFieldError: vi.fn(() => undefined),
    resetForm: mockResetForm
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFormValidation.mockReturnValue(defaultFormValidation);
    mockValidateCreateUser.mockReturnValue({ isValid: true, errors: [] });
    mockValidatePasswordStrength.mockReturnValue([]);
    mockValidateUsernameFormat.mockReturnValue([]);
    mockGetValues.mockReturnValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!'
    });
  });

  it('renders form fields correctly', () => {
    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    expect(screen.getByLabelText(/nome de usuário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar usuário/i })).toBeInTheDocument();
  });

  it('shows password visibility toggle buttons', () => {
    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const passwordToggles = screen.getAllByRole('button');
    // Should have password toggle, confirm password toggle, cancel, and submit buttons
    expect(passwordToggles.length).toBeGreaterThanOrEqual(4);
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isLoading prop is true', () => {
    renderWithProvider(
      <UserRegistrationForm 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /criando usuário/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles successful form submission', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: null,
          created_by: null
        }
      })
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: null,
        created_by: null
      });
    });
  });

  it('handles API error responses', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: 'Username already exists',
        field: 'username'
      })
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('handles network errors', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('validates form before submission', async () => {
    mockValidateAllFields.mockReturnValue(false);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    expect(mockValidateAllFields).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows field errors when validation fails', () => {
    const formValidationWithErrors = {
      ...defaultFormValidation,
      fields: {
        ...defaultFormValidation.fields,
        username: { value: '', error: 'Username is required', touched: true, valid: false }
      },
      hasFieldError: vi.fn((field) => field === 'username'),
      getFieldError: vi.fn((field) => field === 'username' ? 'Username is required' : undefined)
    };

    mockUseFormValidation.mockReturnValue(formValidationWithErrors);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Username is required')).toBeInTheDocument();
  });

  it('calls setFieldValue when input values change', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    await user.type(usernameInput, 'newuser');

    expect(mockSetFieldValue).toHaveBeenCalledWith('username', expect.any(String));
  });

  it('validates username format on blur', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const usernameInput = screen.getByLabelText(/nome de usuário/i);
    await user.type(usernameInput, 'invalid@username');
    await user.tab(); // Trigger blur

    expect(mockValidateUsernameFormat).toHaveBeenCalledWith('invalid@username');
  });

  it('validates password strength on change', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const passwordInput = screen.getByLabelText(/^senha/i);
    await user.type(passwordInput, 'weak');

    expect(mockValidatePasswordStrength).toHaveBeenCalledWith('weak');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const passwordInput = screen.getByLabelText(/^senha/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button');
    const passwordToggle = toggleButtons.find(button => 
      button.getAttribute('aria-label')?.includes('senha')
    );

    if (passwordToggle) {
      await user.click(passwordToggle);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });

  it('resets form after successful submission', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_login: null,
          created_by: null
        }
      })
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockResetForm).toHaveBeenCalled();
    });
  });

  it('handles validation errors from API response', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: 'Validation failed',
        errors: [
          { field: 'username', message: 'Username already exists', code: 'NOT_UNIQUE' }
        ]
      })
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetFieldErrors).toHaveBeenCalledWith({
        username: ['Username already exists']
      });
    });
  });

  it('disables submit button when form is invalid', () => {
    const formValidationInvalid = {
      ...defaultFormValidation,
      isValid: false
    };

    mockUseFormValidation.mockReturnValue(formValidationInvalid);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid', () => {
    const formValidationValid = {
      ...defaultFormValidation,
      isValid: true
    };

    mockUseFormValidation.mockReturnValue(formValidationValid);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows real-time validation feedback', () => {
    const formValidationWithRealTimeErrors = {
      ...defaultFormValidation,
      fields: {
        username: { value: 'test', error: undefined, touched: true, valid: true },
        email: { value: 'invalid-email', error: 'Invalid email format', touched: true, valid: false },
        password: { value: 'weak', error: 'Password too weak', touched: true, valid: false },
        confirmPassword: { value: 'different', error: 'Passwords do not match', touched: true, valid: false }
      },
      hasFieldError: vi.fn((field) => ['email', 'password', 'confirmPassword'].includes(field)),
      getFieldError: vi.fn((field) => {
        const errors = {
          email: 'Invalid email format',
          password: 'Password too weak',
          confirmPassword: 'Passwords do not match'
        };
        return errors[field as keyof typeof errors];
      })
    };

    mockUseFormValidation.mockReturnValue(formValidationWithRealTimeErrors);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Password too weak')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('handles 409 conflict errors specifically', async () => {
    const mockResponse = {
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: 'Username already exists',
        field: 'username'
      })
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    renderWithProvider(
      <UserRegistrationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: /criar usuário/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetFieldErrors).toHaveBeenCalledWith({
        username: ['Username already exists']
      });
    });
  });
});