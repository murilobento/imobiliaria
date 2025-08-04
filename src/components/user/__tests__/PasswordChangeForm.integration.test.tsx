import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PasswordChangeForm from '../PasswordChangeForm';

// Mock the ErrorProvider
vi.mock('@/components/admin/Common/ErrorProvider', () => ({
  useErrorContext: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn()
  })
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PasswordChangeForm Integration', () => {
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

  const renderComponent = (props = {}) => {
    return render(
      <PasswordChangeForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  it('renders and allows user interaction', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Check if form renders
    expect(screen.getByRole('heading', { name: /alterar senha/i })).toBeInTheDocument();
    
    // Check if all fields are present
    const currentPasswordInput = screen.getByLabelText(/senha atual/i);
    const newPasswordInput = screen.getByLabelText(/^nova senha \*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar nova senha/i);
    
    expect(currentPasswordInput).toBeInTheDocument();
    expect(newPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toBeInTheDocument();

    // Test user interaction
    await user.type(currentPasswordInput, 'CurrentPass123!');
    await user.type(newPasswordInput, 'NewPass123!');
    await user.type(confirmPasswordInput, 'NewPass123!');

    expect(currentPasswordInput).toHaveValue('CurrentPass123!');
    expect(newPasswordInput).toHaveValue('NewPass123!');
    expect(confirmPasswordInput).toHaveValue('NewPass123!');
  });

  it('shows password strength feedback in real-time', async () => {
    const user = userEvent.setup();
    renderComponent();

    const newPasswordInput = screen.getByLabelText(/^nova senha \*/i);

    // Type a weak password
    await user.type(newPasswordInput, 'weak');

    // Should show password strength errors
    await waitFor(() => {
      expect(screen.getByText('A senha deve atender aos seguintes critérios:')).toBeInTheDocument();
    });
  });

  it('shows success feedback when passwords are strong and match', async () => {
    const user = userEvent.setup();
    renderComponent();

    const newPasswordInput = screen.getByLabelText(/^nova senha \*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar nova senha/i);

    // Type strong matching passwords
    await user.type(newPasswordInput, 'StrongPass123!');
    await user.type(confirmPasswordInput, 'StrongPass123!');

    // Should show success feedback
    await waitFor(() => {
      expect(screen.getByText('Senha atende aos critérios de segurança')).toBeInTheDocument();
      expect(screen.getByText('Senhas coincidem')).toBeInTheDocument();
    });
  });

  it('handles form submission with API integration', async () => {
    const user = userEvent.setup();
    
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Senha alterada com sucesso'
      })
    });

    renderComponent();

    // Fill form with valid data
    const currentPasswordInput = screen.getByLabelText(/senha atual/i);
    const newPasswordInput = screen.getByLabelText(/^nova senha \*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar nova senha/i);

    await user.type(currentPasswordInput, 'CurrentPass123!');
    await user.type(newPasswordInput, 'NewPass123!');
    await user.type(confirmPasswordInput, 'NewPass123!');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /alterar senha/i });
    await user.click(submitButton);

    // Verify API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/user/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!'
        })
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('displays password requirements information', () => {
    renderComponent();

    // Check if password requirements are displayed
    expect(screen.getByText('Critérios de segurança para a nova senha:')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos uma letra minúscula')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos uma letra maiúscula')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos um número')).toBeInTheDocument();
    expect(screen.getByText('Pelo menos um caractere especial (!@#$%^&*)')).toBeInTheDocument();
    expect(screen.getByText('Diferente da senha atual')).toBeInTheDocument();
  });

  it('handles cancel action', async () => {
    const user = userEvent.setup();
    renderComponent();

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});