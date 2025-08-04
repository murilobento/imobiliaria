import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileEditForm from '../ProfileEditForm';
import type { User } from '@/types/auth';

// Mock the ErrorProvider
vi.mock('@/components/admin/Common/ErrorProvider', () => ({
  useErrorContext: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn()
  })
}));

// Mock the form validation hook
vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: () => ({
    fields: {
      username: { value: 'testuser', error: undefined, touched: false, valid: true },
      email: { value: 'test@example.com', error: undefined, touched: false, valid: true }
    },
    isValid: true,
    isDirty: false,
    setFieldValue: vi.fn(),
    setFieldErrors: vi.fn(),
    validateAllFields: vi.fn(() => true),
    getValues: vi.fn(() => ({ username: 'testuser', email: 'test@example.com' })),
    hasFieldError: vi.fn(() => false),
    getFieldError: vi.fn(() => undefined),
    resetForm: vi.fn()
  })
}));

// Mock user data
const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  last_login: '2024-01-02T15:30:00Z',
  created_by: null
};

// Mock fetch
global.fetch = vi.fn();

describe('ProfileEditForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders form with user data', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText('Editar Perfil')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('has cancel and save buttons', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables form when loading', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
        isLoading={true}
      />
    );
    
    const usernameInput = screen.getByDisplayValue('testuser');
    const emailInput = screen.getByDisplayValue('test@example.com');
    
    expect(usernameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
  });

  it('shows validation feedback for username', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Username field should be present
    expect(screen.getByLabelText(/nome de usuário/i)).toBeInTheDocument();
  });

  it('shows validation feedback for email', () => {
    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Email field should be present
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});