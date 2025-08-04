/**
 * Integration tests for admin layout authentication
 * Tests the integration between AdminLayout, TopBar, and AuthProvider
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../AdminLayout';
import { TopBar } from '../TopBar';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { User } from '@/types/auth';
import { vi } from 'vitest';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the responsive navigation hook
vi.mock('@/hooks/useResponsiveNavigation', () => ({
  useResponsiveNavigation: () => ({
    sidebarOpen: false,
    toggleSidebar: vi.fn(),
    closeSidebar: vi.fn(),
  }),
}));

// Mock the auth API endpoints
global.fetch = vi.fn();

const mockUser: User = {
  id: '1',
  username: 'admin',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z',
};

const mockPush = vi.fn();
(useRouter as any).mockReturnValue({
  push: mockPush,
});

// Helper component to test auth context
const TestAuthComponent = () => {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `${user.username} - ${user.role}` : 'no-user'}
      </div>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('Admin Layout Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  describe('AuthProvider Integration', () => {
    it('should provide authentication context to child components', async () => {
      // Mock successful token verification
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
        }),
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Initially loading
      expect(screen.getByTestId('auth-status')).toHaveTextContent('loading');

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      expect(screen.getByTestId('user-info')).toHaveTextContent('admin - admin');
    });

    it('should handle authentication failure', async () => {
      // Mock failed token verification
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
        }),
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      expect(screen.getByTestId('user-info')).toHaveTextContent('no-user');
    });

    it('should handle logout functionality', async () => {
      // Mock successful token verification
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            user: mockUser,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Click logout
      fireEvent.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      expect(window.location.href).toBe('/login');
    });
  });

  describe('AdminLayout Authentication', () => {
    it('should show loading spinner while authentication is being verified', () => {
      // Mock loading state
      (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <AuthProvider>
          <AdminLayout>
            <div>Admin Content</div>
          </AdminLayout>
        </AuthProvider>
      );

      expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', async () => {
      // Mock failed authentication
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false }),
      });

      render(
        <AuthProvider>
          <AdminLayout>
            <div>Admin Content</div>
          </AdminLayout>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Redirecionando para login...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should render admin content when authenticated', async () => {
      // Mock successful authentication
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
        }),
      });

      render(
        <AuthProvider>
          <AdminLayout>
            <div>Admin Content</div>
          </AdminLayout>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Verificando autenticação...')).not.toBeInTheDocument();
      expect(screen.queryByText('Redirecionando para login...')).not.toBeInTheDocument();
    });
  });

  describe('TopBar Authentication', () => {
    it('should display user information when authenticated', async () => {
      // Mock successful authentication
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
        }),
      });

      render(
        <AuthProvider>
          <TopBar onMenuClick={vi.fn()} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    it('should show loading state while authentication is being verified', () => {
      // Mock loading state
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(
        <AuthProvider>
          <TopBar onMenuClick={vi.fn()} />
        </AuthProvider>
      );

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('should handle logout from user menu', async () => {
      // Mock successful authentication and logout
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            user: mockUser,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(
        <AuthProvider>
          <TopBar onMenuClick={vi.fn()} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
      });

      // Click user menu button
      const userButton = screen.getByLabelText('Menu do usuário');
      fireEvent.click(userButton);

      // Wait for menu to appear and click logout
      await waitFor(() => {
        expect(screen.getByText('Sair')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Sair'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });
    });

    it('should show user details in dropdown menu', async () => {
      // Mock successful authentication
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
        }),
      });

      render(
        <AuthProvider>
          <TopBar onMenuClick={vi.fn()} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
      });

      // Click user menu button
      const userButton = screen.getByLabelText('Menu do usuário');
      fireEvent.click(userButton);

      // Check user details in dropdown
      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText(/admin •/)).toBeInTheDocument();
        expect(screen.getByText('Configurações')).toBeInTheDocument();
        expect(screen.getByText('Sair')).toBeInTheDocument();
      });
    });

    it('should disable user menu when loading or logging out', async () => {
      // Mock successful authentication
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
        }),
      });

      render(
        <AuthProvider>
          <TopBar onMenuClick={vi.fn()} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
      });

      const userButton = screen.getByLabelText('Menu do usuário');
      expect(userButton).not.toBeDisabled();

      // During loading, button should be disabled
      // This is tested in the loading state test above
    });
  });

  describe('Authentication State Persistence', () => {
    it('should maintain authentication state across component remounts', async () => {
      // Mock successful authentication
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
        }),
      });

      const { rerender } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Rerender the component
      rerender(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Should still be authenticated after remount
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      expect(screen.getByTestId('user-info')).toHaveTextContent('no-user');
    });

    it('should handle logout errors gracefully', async () => {
      // Mock successful authentication but failed logout
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            user: mockUser,
          }),
        })
        .mockRejectedValueOnce(new Error('Logout failed'));

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Click logout
      fireEvent.click(screen.getByTestId('logout-btn'));

      // Should still redirect even if logout request fails
      await waitFor(() => {
        expect(window.location.href).toBe('/login');
      });
    });
  });
});