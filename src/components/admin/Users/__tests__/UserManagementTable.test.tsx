import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import UserManagementTable from '../UserManagementTable';
import { User } from '@/lib/auth/database';

// Mock the child components
vi.mock('../../Common/LoadingSpinner', () => ({
  default: ({ text }: { text: string }) => <div data-testid="loading-spinner">{text}</div>
}));

vi.mock('../../Common/ConfirmDialog', () => ({
  default: ({ isOpen, onConfirm, onClose, title, message, loading }: any) => (
    isOpen ? (
      <div data-testid="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm} disabled={loading} data-testid="confirm-button">
          {loading ? 'Loading...' : 'Confirm'}
        </button>
        <button onClick={onClose} data-testid="cancel-button">Cancel</button>
      </div>
    ) : null
  )
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample user data
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin1',
    email: 'admin1@example.com',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    last_login: '2024-01-02T10:00:00Z',
    created_by: null
  },
  {
    id: '2',
    username: 'admin2',
    email: 'admin2@example.com',
    role: 'admin',
    is_active: false,
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z',
    last_login: null,
    created_by: '1'
  }
];

const mockUserListResponse = {
  users: mockUsers,
  total: 2,
  page: 1,
  limit: 10
};

describe('UserManagementTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockUserListResponse
      })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders loading state initially', async () => {
    render(<UserManagementTable />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Carregando usuários...')).toBeInTheDocument();
  });

  it('fetches and displays users on mount', async () => {
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users?page=1&limit=10',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
      expect(screen.getByText('admin2')).toBeInTheDocument();
      expect(screen.getByText('admin1@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin2@example.com')).toBeInTheDocument();
    });
  });

  it('displays user status correctly', async () => {
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument();
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    render(<UserManagementTable />);

    await waitFor(() => {
      // Check that dates are formatted (exact format may vary by locale)
      expect(screen.getAllByText(/01\/01\/2024/)).toHaveLength(2); // Two users created on same date
      expect(screen.getByText(/02\/01\/2024/)).toBeInTheDocument();
      expect(screen.getByText('Nunca')).toBeInTheDocument(); // For user with no last_login
    });
  });

  it('handles search functionality with debounce', async () => {
    vi.useFakeTimers();
    render(<UserManagementTable />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    
    // Type in search input
    fireEvent.change(searchInput, { target: { value: 'admin1' } });

    // Fast-forward timers to trigger debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users?page=1&limit=10&search=admin1',
        expect.any(Object)
      );
    });

    vi.useRealTimers();
  });

  it('handles pagination correctly', async () => {
    const mockLargeResponse = {
      users: mockUsers,
      total: 25,
      page: 1,
      limit: 10
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockLargeResponse
      })
    });

    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('Mostrando')).toBeInTheDocument();
      expect(screen.getByText('de 25 usuários')).toBeInTheDocument();
    });

    // Test page size change
    const pageSizeSelect = screen.getByDisplayValue('10');
    fireEvent.change(pageSizeSelect, { target: { value: '25' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users?page=1&limit=25',
        expect.any(Object)
      );
    });
  });

  it('opens confirmation dialog when status toggle is clicked', async () => {
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    // Click on deactivate button for active user
    const deactivateButtons = screen.getAllByTitle('Desativar usuário');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('Desativar Usuário')).toBeInTheDocument();
      expect(screen.getByText(/deseja desativar o usuário "admin1"/)).toBeInTheDocument();
    });
  });

  it('handles user status toggle successfully', async () => {
    const onUserStatusChange = vi.fn();
    render(<UserManagementTable onUserStatusChange={onUserStatusChange} />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    // Mock the PATCH request for status toggle
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { ...mockUsers[0], is_active: false }
      })
    });

    // Click deactivate button
    const deactivateButtons = screen.getAllByTitle('Desativar usuário');
    fireEvent.click(deactivateButtons[0]);

    // Confirm the action
    const confirmButton = await screen.findByTestId('confirm-button');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/1',
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: false })
        })
      );
    });

    await waitFor(() => {
      expect(onUserStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', is_active: false })
      );
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    });
  });

  it('displays empty state when no users found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { users: [], total: 0, page: 1, limit: 10 }
      })
    });

    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum usuário cadastrado')).toBeInTheDocument();
    });
  });

  it('displays search empty state when no results found', async () => {
    vi.useFakeTimers();
    
    // Initial load with users
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    // Mock empty search result
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { users: [], total: 0, page: 1, limit: 10 }
      })
    });

    // Search for non-existent user
    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum usuário encontrado para "nonexistent"')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('handles status toggle error', async () => {
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    // Mock failed PATCH request
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'Failed to update user status'
      })
    });

    // Click deactivate button
    const deactivateButtons = screen.getAllByTitle('Desativar usuário');
    fireEvent.click(deactivateButtons[0]);

    // Confirm the action
    const confirmButton = await screen.findByTestId('confirm-button');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update user status')).toBeInTheDocument();
    });
  });

  it('prevents closing dialog while loading', async () => {
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });

    // Click deactivate button
    const deactivateButtons = screen.getAllByTitle('Desativar usuário');
    fireEvent.click(deactivateButtons[0]);

    // Mock slow PATCH request
    mockFetch.mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { ...mockUsers[0], is_active: false }
        })
      }), 1000);
    }));

    // Confirm the action
    const confirmButton = await screen.findByTestId('confirm-button');
    fireEvent.click(confirmButton);

    // Try to cancel while loading
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    // Dialog should still be open
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('retries fetching users when retry button is clicked', async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Second call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockUserListResponse
      })
    });

    // Click retry button
    const retryButton = screen.getByText('Tentar novamente');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('admin1')).toBeInTheDocument();
    });
  });
});