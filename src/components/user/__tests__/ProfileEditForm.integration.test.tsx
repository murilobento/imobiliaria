import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileEditForm from '../ProfileEditForm';
import type { User } from '@/types/auth';

// Mock the ErrorProvider
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();

vi.mock('@/components/admin/Common/ErrorProvider', () => ({
  useErrorContext: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess
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

describe('ProfileEditForm Integration', () => {
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

  it('successfully updates user profile', async () => {
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: {
          ...mockUser,
          username: 'newusername',
          email: 'newemail@example.com'
        }
      })
    });

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );

    // Change username
    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'newusername' } });

    // Change email
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          username: 'newusername',
          email: 'newemail@example.com'
        })
      });
    });

    // Verify success callback was called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({
        ...mockUser,
        username: 'newusername',
        email: 'newemail@example.com'
      });
    });

    // Verify success message was shown
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Perfil atualizado',
      'Perfil atualizado com sucesso'
    );
  });

  it('handles API validation errors', async () => {
    // Mock API error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username já está em uso',
          field: 'username'
        }
      })
    });

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );

    // Change username to trigger validation error
    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'existinguser' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Erro de validação',
        'Username já está em uso'
      );
    });

    // Verify success callback was not called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('handles network errors', async () => {
    // Mock network error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );

    // Change username
    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'newusername' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Tente novamente.'
      );
    });

    // Verify success callback was not called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('handles missing auth token', async () => {
    // Mock localStorage without token
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    render(
      <ProfileEditForm 
        user={mockUser} 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );

    // Change username
    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'newusername' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Erro de autenticação',
        'Token de acesso não encontrado. Faça login novamente.'
      );
    });

    // Verify API was not called
    expect(global.fetch).not.toHaveBeenCalled();
  });
});