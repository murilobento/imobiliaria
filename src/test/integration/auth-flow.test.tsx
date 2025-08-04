/**
 * Authentication Flow Integration Tests
 * Tests complete login to admin access flow, logout, session invalidation,
 * route protection, and error handling scenarios
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextRequest, NextResponse } from 'next/server';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import LoginPage from '@/app/login/page';
import { AdminLayout } from '@/components/admin/Layout/AdminLayout';
import { ErrorProvider } from '@/components/admin/Common/ErrorProvider';
import { middleware } from '../../../middleware';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as verifyGet } from '@/app/api/auth/verify/route';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/admin',
}));

// Mock auth database functions
vi.mock('@/lib/auth/database', () => ({
  verifyUserPassword: vi.fn(),
  updateLastLogin: vi.fn(),
  findUserByUsername: vi.fn(),
}));

// Mock JWT functions
vi.mock('@/lib/auth/jwt', () => ({
  generateJWTToken: vi.fn(),
  verifyJWTToken: vi.fn(),
  validateJWTToken: vi.fn(),
  extractUserIdFromToken: vi.fn(),
}));

// Mock rate limiting
vi.mock('@/lib/auth/rateLimitMiddleware', () => ({
  rateLimitMiddleware: vi.fn(),
  handleFailedAuth: vi.fn(),
  handleSuccessfulAuth: vi.fn(),
}));

// Mock security logger
vi.mock('@/lib/auth/securityLogger', () => ({
  logSecurityEvent: vi.fn(),
}));

// Mock rate limit utilities
vi.mock('@/lib/auth/rateLimit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

// Test data
const mockUser = {
  id: 'user-123',
  username: 'admin',
  role: 'admin' as const,
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z',
};

const mockDbUser = {
  id: 'user-123',
  username: 'admin',
  password_hash: 'hashed-password',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z',
};

const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

describe('Authentication Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeAll(() => {
    // Setup global fetch mock
    global.fetch = vi.fn();
  });

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    
    // Reset environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Login to Admin Access Flow', () => {
    it('should complete successful login flow from form to admin panel', async () => {
      // Mock successful fetch for login
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const onSuccess = vi.fn();

      render(
        <AuthProvider>
          <LoginForm onSuccess={onSuccess} />
        </AuthProvider>
      );

      // Wait for form to be ready (not in loading state)
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).not.toBeDisabled();
      });

      // Fill in login form
      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');

      // Find submit button (might be in loading state initially)
      const submitButton = screen.getByRole('button', { type: 'submit' });
      await user.click(submitButton);

      // Wait for login to complete
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password123' }),
      });
    });

    it('should handle login form validation errors', async () => {
      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      );

      // Wait for form to be ready
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { type: 'submit' });

      // Try to submit empty form
      await user.click(submitButton);

      // Check validation messages
      await waitFor(() => {
        expect(screen.getByText(/usuário é obrigatório/i)).toBeInTheDocument();
        expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument();
      });

      // Button should be disabled
      expect(submitButton).toBeDisabled();
    });

    it('should handle login API errors gracefully', async () => {
      // Mock failed fetch
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      );

      // Wait for form to be ready
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).not.toBeDisabled();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should redirect authenticated users away from login page', async () => {
      // Mock successful token verification
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for authentication check and redirect
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/admin');
      });
    });
  });

  describe('Logout and Session Invalidation', () => {
    it('should complete logout flow and clear authentication state', async () => {
      // Mock initial authentication
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const TestComponent = () => {
        const { user, logout, isAuthenticated } = useAuth();
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="user-info">
              {user ? user.username : 'no-user'}
            </div>
            <button onClick={logout} data-testid="logout-button">
              Logout
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('admin');
      });

      // Trigger logout
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Wait for logout to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    it('should handle logout API errors gracefully', async () => {
      // Mock initial authentication success, then logout failure
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockRejectedValueOnce(new Error('Network error'));

      // Mock window.location.href
      const mockLocation = { href: 'http://localhost:3000/' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const TestComponent = () => {
        const { logout, user } = useAuth();
        return (
          <div>
            <div data-testid="user-status">
              {user ? 'logged-in' : 'logged-out'}
            </div>
            <button onClick={logout} data-testid="logout-button">
              Logout
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('logged-in');
      });

      // Trigger logout (should still clear state even on API error)
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Should clear user state even on API error
      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('logged-out');
      });
    });
  });

  describe('Route Protection Scenarios', () => {
    it('should protect admin routes for unauthenticated users', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      
      // Mock invalid token validation
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: false,
        error: 'TOKEN_INVALID',
      });

      // Create mock request for protected route
      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET',
      });

      const response = await middleware(request);

      // Should redirect to login
      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get('location')).toContain('/login');
    });

    it('should allow access to admin routes for authenticated users', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      
      // Mock valid token validation
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Create mock request with valid token
      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET',
        headers: {
          cookie: 'auth-token=valid-token',
        },
      });

      const response = await middleware(request);

      // Should allow access
      expect(response.status).toBe(200);
      expect(response.headers.get('x-user-id')).toBe(mockUser.id);
      expect(response.headers.get('x-user-username')).toBe(mockUser.username);
    });

    it('should redirect authenticated users away from login page', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      
      // Mock valid token validation
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Create mock request for login page with valid token
      const request = new NextRequest('http://localhost:3000/login', {
        method: 'GET',
        headers: {
          cookie: 'auth-token=valid-token',
        },
      });

      const response = await middleware(request);

      // Should redirect to admin
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/admin');
    });

    it('should handle expired tokens by redirecting to login', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      
      // Mock expired token validation
      vi.mocked(validateJWTToken).mockResolvedValue({
        valid: false,
        error: 'TOKEN_EXPIRED',
      });

      // Create mock request with expired token
      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET',
        headers: {
          cookie: 'auth-token=expired-token',
        },
      });

      const response = await middleware(request);

      // Should redirect to login and clear cookie
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
      
      // Check that cookie is cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('auth-token=;');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during authentication', async () => {
      // Mock network error
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      );

      // Wait for form to be ready
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).not.toBeDisabled();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('invalid json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      );

      // Wait for form to be ready
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).not.toBeDisabled();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should handle JSON parsing error
      await waitFor(() => {
        expect(screen.getByText(/erro ao fazer login/i)).toBeInTheDocument();
      });
    });

    it('should handle token refresh failures', async () => {
      // Mock initial success, then failure on refresh
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: 'Token expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const TestComponent = () => {
        const { isAuthenticated } = useAuth();
        return (
          <div data-testid="auth-status">
            {isAuthenticated ? 'authenticated' : 'not-authenticated'}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Simulate token refresh failure (this would normally happen on visibility change or interval)
      // We'll trigger it by simulating a visibility change event
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should eventually become unauthenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      }, { timeout: 5000 });
    });

    it('should handle admin layout authentication check', async () => {
      // Mock unauthenticated state
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <ErrorProvider>
          <AuthProvider>
            <AdminLayout>
              <div>Admin Content</div>
            </AdminLayout>
          </AuthProvider>
        </ErrorProvider>
      );

      // Should show loading initially
      expect(screen.getByText(/verificando autenticação/i)).toBeInTheDocument();

      // Should redirect to login when not authenticated
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle middleware errors gracefully', async () => {
      const { validateJWTToken } = await import('@/lib/auth/jwt');
      
      // Mock middleware error
      vi.mocked(validateJWTToken).mockRejectedValue(new Error('Database connection failed'));

      // Create mock request for protected route
      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET',
        headers: {
          cookie: 'auth-token=some-token',
        },
      });

      const response = await middleware(request);

      // Should redirect to login on error
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });
  });
});