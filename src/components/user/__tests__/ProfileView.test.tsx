import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProfileView from '../ProfileView';
import type { User } from '@/types/auth';

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

describe('ProfileView', () => {
  it('renders user profile information correctly', () => {
    const mockOnEdit = vi.fn();
    
    render(<ProfileView user={mockUser} onEdit={mockOnEdit} />);
    
    // Check if user information is displayed
    expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = vi.fn();
    
    render(<ProfileView user={mockUser} onEdit={mockOnEdit} />);
    
    const editButton = screen.getByRole('button', { name: /editar perfil/i });
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('disables edit button when loading', () => {
    const mockOnEdit = vi.fn();
    
    render(<ProfileView user={mockUser} onEdit={mockOnEdit} isLoading={true} />);
    
    const editButton = screen.getByRole('button', { name: /editar perfil/i });
    expect(editButton).toBeDisabled();
  });

  it('formats dates correctly', () => {
    const mockOnEdit = vi.fn();
    
    render(<ProfileView user={mockUser} onEdit={mockOnEdit} />);
    
    // Check if dates are formatted in Brazilian format
    expect(screen.getByText(/01\/01\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/02\/01\/2024/)).toBeInTheDocument();
  });

  it('handles user without last_login', () => {
    const userWithoutLastLogin = { ...mockUser, last_login: null };
    const mockOnEdit = vi.fn();
    
    render(<ProfileView user={userWithoutLastLogin} onEdit={mockOnEdit} />);
    
    // Should not show last login section
    expect(screen.queryByText('Último acesso')).not.toBeInTheDocument();
  });

  it('shows inactive status correctly', () => {
    const inactiveUser = { ...mockUser, is_active: false };
    const mockOnEdit = vi.fn();
    
    render(<ProfileView user={inactiveUser} onEdit={mockOnEdit} />);
    
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });
});