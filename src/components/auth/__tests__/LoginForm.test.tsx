import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LoginForm from '../LoginForm';
import { AuthProvider } from '../AuthProvider';

// Mock the AuthProvider
const mockLogin = vi.fn();
const mockLogout = vi.fn();

const MockAuthProvider = ({ children, isLoading = false }: { children: React.ReactNode; isLoading?: boolean }) => {
  const mockContextValue = {
    user: null,
    login: mockLogin,
    logout: mockLogout,
    isLoading,
    isAuthenticated: false,
  };

  return (
    <div data-testid="mock-auth-provider">
      {React.cloneElement(children as React.ReactElement, {
        ...mockContextValue,
      })}
    </div>
  );
};

// Mock useAuth hook
vi.mock('../AuthProvider', async () => {
  const actual = await vi.importActual('../AuthProvider');
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      login: mockLogin,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: false,
    }),
  };
});

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders login form with all required fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    
    // Type and then clear to trigger validation
    await user.type(usernameInput, 'a');
    await user.clear(usernameInput);
    
    await user.type(passwordInput, 'a');
    await user.clear(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/usuário é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('validates username format', async () => {
    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);

    // Test invalid characters
    await user.type(usernameInput, 'user@invalid');
    await user.tab(); // Trigger validation

    await waitFor(() => {
      expect(screen.getByText(/usuário deve conter apenas letras, números, _ ou -/i)).toBeInTheDocument();
    });

    // Clear and test minimum length
    await user.clear(usernameInput);
    await user.type(usernameInput, 'a');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/usuário deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
    });
  });

  it('validates username length limits', async () => {
    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);

    // Test maximum length (51 characters)
    const longUsername = 'a'.repeat(51);
    await user.type(usernameInput, longUsername);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/usuário deve ter no máximo 50 caracteres/i)).toBeInTheDocument();
    });
  });

  it('enables submit button only when form is valid', async () => {
    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Fill valid data
    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('calls login function with correct credentials on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    
    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
    });
  });

  it('displays loading state during submission', async () => {
    // Mock login to return a pending promise
    let resolveLogin: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/entrando.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    // Resolve the promise
    resolveLogin!();
    await waitFor(() => {
      expect(screen.getByText(/entrar/i)).toBeInTheDocument();
    });
  });

  it('displays error message on login failure', async () => {
    const errorMessage = 'Credenciais inválidas';
    mockLogin.mockRejectedValue(new Error(errorMessage));

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/erro no login/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback after successful login', async () => {
    const onSuccess = vi.fn();
    mockLogin.mockResolvedValue(undefined);

    render(<LoginForm onSuccess={onSuccess} />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('resets form after successful login', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(usernameInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });
  });

  it('prevents multiple submissions', async () => {
    let resolveLogin: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');
    
    // Click multiple times
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Should only be called once
    expect(mockLogin).toHaveBeenCalledTimes(1);

    resolveLogin!();
  });

  it('applies custom className', () => {
    const customClass = 'custom-login-form';
    render(<LoginForm className={customClass} />);

    const formContainer = screen.getByRole('form').parentElement;
    expect(formContainer).toHaveClass(customClass);
  });

  it('has proper accessibility attributes', () => {
    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);

    expect(usernameInput).toHaveAttribute('autoComplete', 'username');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows error with proper ARIA attributes', async () => {
    const errorMessage = 'Login failed';
    mockLogin.mockRejectedValue(new Error(errorMessage));

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/usuário/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      const errorElement = screen.getByText(errorMessage);
      expect(errorElement.closest('[role="alert"]')).toBeInTheDocument();
    });
  });
});