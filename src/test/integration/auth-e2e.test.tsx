/**
 * End-to-End Authentication Tests
 * Tests complete user journey from login to admin operations,
 * responsive behavior, browser compatibility, and error scenarios
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import LoginPage from '@/app/login/page';
import { AdminLayout } from '@/components/admin/Layout/AdminLayout';
import { ErrorProvider } from '@/components/admin/Common/ErrorProvider';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  usePathname: () => '/admin',
}));

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage for session persistence tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Test data
const mockUser = {
  id: 'user-123',
  username: 'admin',
  role: 'admin' as const,
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z',
};

describe('End-to-End Authentication Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeAll(() => {
    // Setup global fetch mock
    global.fetch = vi.fn();
    
    // Mock document.title for SEO tests
    Object.defineProperty(document, 'title', {
      writable: true,
      value: 'Test Page',
    });

    // Mock document.querySelector for meta tags
    const mockQuerySelector = vi.fn();
    Object.defineProperty(document, 'querySelector', {
      value: mockQuerySelector,
    });

    // Mock document.head for meta tag manipulation
    const mockHead = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      children: [],
    };
    Object.defineProperty(document, 'head', {
      value: mockHead,
      writable: true,
    });

    // Mock document.createElement for meta tags
    const mockCreateElement = vi.fn().mockReturnValue({
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      tagName: 'META',
      nodeType: 1,
    });
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true,
    });
  });

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Journey from Login to Admin Operations', () => {
    it('should complete full authentication flow with successful admin access', async () => {
      // Mock successful authentication flow
      vi.mocked(global.fetch)
        // Initial auth check (unauthenticated)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        // Login request
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        // Post-login auth verification
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      // Render login page
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for page to load and show login form
      await waitFor(() => {
        expect(screen.getByText(/painel administrativo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      // Fill in login form
      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');

      // Submit form
      const submitButton = screen.getByRole('button', { type: 'submit' });
      await user.click(submitButton);

      // Wait for login to complete and redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });

      // Verify API calls were made
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    });

    it('should handle admin layout rendering after successful authentication', async () => {
      // Mock authenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Render admin layout
      render(
        <ErrorProvider>
          <AuthProvider>
            <AdminLayout>
              <div data-testid="admin-content">Admin Dashboard Content</div>
            </AdminLayout>
          </AuthProvider>
        </ErrorProvider>
      );

      // Wait for authentication and content to load
      await waitFor(() => {
        expect(screen.getByTestId('admin-content')).toBeInTheDocument();
      });

      // Verify admin layout elements are present
      expect(screen.getByTestId('admin-content')).toHaveTextContent('Admin Dashboard Content');
    });

    it('should handle logout flow and return to login page', async () => {
      // Mock authenticated state, then logout
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

      // Mock window.location.href for logout redirect
      const mockLocation = { href: 'http://localhost:3000/' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const TestComponent = () => {
        const { logout, isAuthenticated, user } = useAuth();
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

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('admin');
      });

      // Trigger logout
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Verify logout API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object));
      });
    });

    it('should handle session persistence across page reloads', async () => {
      // Mock persistent authentication
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const TestComponent = () => {
        const { isAuthenticated, user, isLoading } = useAuth();
        
        if (isLoading) {
          return <div data-testid="loading">Loading...</div>;
        }
        
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="user-info">
              {user ? user.username : 'no-user'}
            </div>
          </div>
        );
      };

      // First render - simulating page load
      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Simulate page reload by re-rendering
      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should maintain authentication state
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('admin');
      });
    });
  });

  describe('Responsive Behavior on Mobile Devices', () => {
    it('should render login form responsively on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Mock unauthenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      // Check that form elements are present and accessible
      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      expect(usernameInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();

      // Test form interaction on mobile
      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password');

      expect(usernameInput).toHaveValue('admin');
      expect(passwordInput).toHaveValue('password');
    });

    it('should handle admin layout responsively', async () => {
      // Mock authenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <ErrorProvider>
          <AuthProvider>
            <AdminLayout>
              <div data-testid="mobile-content">Mobile Admin Content</div>
            </AdminLayout>
          </AuthProvider>
        </ErrorProvider>
      );

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('mobile-content')).toBeInTheDocument();
      });

      // Verify content is accessible on mobile
      expect(screen.getByTestId('mobile-content')).toHaveTextContent('Mobile Admin Content');
    });

    it('should handle touch interactions on mobile devices', async () => {
      // Mock unauthenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      // Simulate touch events
      fireEvent.touchStart(usernameInput);
      fireEvent.touchEnd(usernameInput);
      
      // Focus should work with touch
      expect(usernameInput).toHaveFocus();

      // Touch on submit button
      fireEvent.touchStart(submitButton);
      fireEvent.touchEnd(submitButton);
      
      // Button should be accessible via touch
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility and Session Persistence', () => {
    it('should work with different cookie settings', async () => {
      // Mock successful authentication
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Mock document.cookie
      let cookieValue = '';
      Object.defineProperty(document, 'cookie', {
        get: () => cookieValue,
        set: (value) => { cookieValue = value; },
      });

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

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });

    it('should handle localStorage availability', async () => {
      // Mock localStorage being unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      // Mock successful authentication
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
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

      // Should still work without localStorage
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle sessionStorage for temporary data', async () => {
      // Mock successful authentication
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const TestComponent = () => {
        const { isAuthenticated, user } = useAuth();
        
        // Simulate storing temporary session data
        React.useEffect(() => {
          if (isAuthenticated && user) {
            sessionStorage.setItem('lastActivity', Date.now().toString());
          }
        }, [isAuthenticated, user]);

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

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Verify sessionStorage was used
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'lastActivity',
        expect.any(String)
      );
    });
  });

  describe('Error Scenarios and Recovery Flows', () => {
    it('should handle network connectivity issues gracefully', async () => {
      // Mock network error
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
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

    it('should handle server errors and show appropriate messages', async () => {
      // Mock server error
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      });
    });

    it('should handle session expiration during admin operations', async () => {
      // Mock initial authentication success, then session expiration
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: 'Session expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const TestComponent = () => {
        const { isAuthenticated, user } = useAuth();
        
        // Simulate triggering a session check
        React.useEffect(() => {
          if (isAuthenticated) {
            setTimeout(() => {
              fetch('/api/auth/verify', { credentials: 'include' });
            }, 100);
          }
        }, [isAuthenticated]);

        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="user-info">
              {user ? user.username : 'no-user'}
            </div>
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

      // Wait for session expiration to be detected
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      }, { timeout: 3000 });
    });

    it('should handle malformed server responses', async () => {
      // Mock malformed response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('invalid json response', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should handle JSON parsing error gracefully
      await waitFor(() => {
        expect(screen.getByText(/erro ao fazer login/i)).toBeInTheDocument();
      });
    });

    it('should provide recovery options for failed authentication', async () => {
      // Mock failed authentication
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Should show error and allow retry
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Form should still be usable for retry
      expect(usernameInput).toBeEnabled();
      expect(passwordInput).toBeEnabled();
      expect(submitButton).toBeEnabled();

      // Clear and retry with correct credentials
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');

      // Mock successful retry
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await user.click(submitButton);

      // Should redirect on success
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });

    it('should handle rate limiting scenarios gracefully', async () => {
      // Mock rate limiting response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: false, 
          error: 'Too many attempts. Please try again later.' 
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '900'
          },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show rate limiting message
      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
      });

      // Form should be disabled during rate limiting
      expect(submitButton).toBeDisabled();
    });

    it('should handle CSRF token validation errors', async () => {
      // Mock CSRF error
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ 
          success: false, 
          error: 'CSRF token validation failed' 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show CSRF error and allow retry
      await waitFor(() => {
        expect(screen.getByText(/csrf token validation failed/i)).toBeInTheDocument();
      });

      // Form should still be usable for retry
      expect(usernameInput).toBeEnabled();
      expect(passwordInput).toBeEnabled();
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Accessibility and SEO Compliance', () => {
    it('should have proper ARIA labels and roles', async () => {
      // Mock unauthenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      // Check ARIA labels
      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      expect(usernameInput).toHaveAttribute('aria-label');
      expect(passwordInput).toHaveAttribute('aria-label');
      expect(submitButton).toHaveAttribute('type', 'submit');

      // Check form has proper role
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should handle keyboard navigation properly', async () => {
      // Mock unauthenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      // Test tab navigation
      usernameInput.focus();
      expect(usernameInput).toHaveFocus();

      // Tab to password field
      await user.tab();
      expect(passwordInput).toHaveFocus();

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();

      // Enter key should submit form
      await user.keyboard('{Enter}');
      
      // Should trigger form submission
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
      });
    });

    it('should have proper focus management for screen readers', async () => {
      // Mock authentication error
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
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

      // Error message should have proper ARIA attributes
      const errorMessage = screen.getByText(/invalid credentials/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states during authentication', async () => {
      // Mock slow authentication response
      vi.mocked(global.fetch).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve(new Response(JSON.stringify({ success: true, user: mockUser }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })), 1000
          )
        )
      );

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/fazendo login/i)).toBeInTheDocument();
      });

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });

    it('should handle concurrent authentication requests', async () => {
      let requestCount = 0;
      vi.mocked(global.fetch).mockImplementation(() => {
        requestCount++;
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/usuário/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { type: 'submit' });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');

      // Rapidly click submit multiple times
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only make one request (prevent duplicate submissions)
      await waitFor(() => {
        expect(requestCount).toBe(1);
      });
    });
  });
});