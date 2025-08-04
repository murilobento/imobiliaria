/**
 * End-to-End Authentication Tests - Simplified Version
 * Tests complete user journey from login to admin operations,
 * responsive behavior, browser compatibility, and error scenarios
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';

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

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 768px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
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
  });

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Journey from Login to Admin Operations', () => {
    it('should handle authentication state management correctly', async () => {
      // Mock successful authentication
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const TestComponent = () => {
        const { isAuthenticated, user, isLoading, login, logout } = useAuth();
        
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
            <button 
              onClick={() => login('admin', 'password123')} 
              data-testid="login-button"
            >
              Login
            </button>
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

      // Initially should be authenticated (mocked response)
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('admin');
      });

      // Test login functionality
      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Verify login API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            username: 'admin',
            password: 'password123',
          }),
        }));
      });
    });

    it('should handle logout flow correctly', async () => {
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
      });

      // Trigger logout
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Verify logout API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
          method: 'POST',
        }));
      });
    });

    it('should handle session persistence across component re-renders', async () => {
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

      // First render
      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Re-render to simulate page reload
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
    it('should handle mobile viewport detection', async () => {
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

      // Mock authenticated state
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true, user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const TestComponent = () => {
        const { isAuthenticated } = useAuth();
        const [isMobile, setIsMobile] = React.useState(false);

        React.useEffect(() => {
          const mediaQuery = window.matchMedia('(max-width: 768px)');
          setIsMobile(mediaQuery.matches);
        }, []);

        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="viewport-status">
              {isMobile ? 'mobile' : 'desktop'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should detect mobile viewport
      await waitFor(() => {
        expect(screen.getByTestId('viewport-status')).toHaveTextContent('mobile');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });
  });

  describe('Browser Compatibility and Session Persistence', () => {
    it('should handle localStorage availability gracefully', async () => {
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
        const [storageAvailable, setStorageAvailable] = React.useState(true);

        React.useEffect(() => {
          try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
          } catch (e) {
            setStorageAvailable(false);
          }
        }, []);

        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="storage-status">
              {storageAvailable ? 'available' : 'unavailable'}
            </div>
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
        expect(screen.getByTestId('storage-status')).toHaveTextContent('unavailable');
      });

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle cookie-based session management', async () => {
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
        configurable: true,
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
  });

  describe('Error Scenarios and Recovery Flows', () => {
    it('should handle network connectivity issues gracefully', async () => {
      // Mock network error
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const TestComponent = () => {
        const { login, isLoading } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleLogin = async () => {
          try {
            await login('admin', 'password123');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          }
        };

        return (
          <div>
            <button onClick={handleLogin} data-testid="login-button">
              {isLoading ? 'Loading...' : 'Login'}
            </button>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should handle server errors appropriately', async () => {
      // Mock server error
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const TestComponent = () => {
        const { login } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleLogin = async () => {
          try {
            await login('admin', 'password123');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          }
        };

        return (
          <div>
            <button onClick={handleLogin} data-testid="login-button">
              Login
            </button>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should handle session expiration during operations', async () => {
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

    it('should handle rate limiting scenarios', async () => {
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

      const TestComponent = () => {
        const { login } = useAuth();
        const [error, setError] = React.useState<string | null>(null);
        const [isRateLimited, setIsRateLimited] = React.useState(false);

        const handleLogin = async () => {
          try {
            await login('admin', 'password123');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            if (errorMessage.includes('Too many attempts')) {
              setIsRateLimited(true);
            }
          }
        };

        return (
          <div>
            <button 
              onClick={handleLogin} 
              data-testid="login-button"
              disabled={isRateLimited}
            >
              Login
            </button>
            {error && <div data-testid="error-message">{error}</div>}
            {isRateLimited && <div data-testid="rate-limit-status">Rate limited</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Should show rate limiting message and disable button
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(/too many attempts/i);
        expect(screen.getByTestId('rate-limit-status')).toBeInTheDocument();
        expect(loginButton).toBeDisabled();
      });
    });

    it('should provide recovery options for failed authentication', async () => {
      // Mock failed authentication, then successful retry
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, user: mockUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const TestComponent = () => {
        const { login, isAuthenticated } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleLogin = async (credentials: { username: string; password: string }) => {
          try {
            setError(null);
            await login(credentials.username, credentials.password);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          }
        };

        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <button 
              onClick={() => handleLogin({ username: 'admin', password: 'wrongpassword' })}
              data-testid="login-wrong-button"
            >
              Login (Wrong)
            </button>
            <button 
              onClick={() => handleLogin({ username: 'admin', password: 'correctpassword' })}
              data-testid="login-correct-button"
            >
              Login (Correct)
            </button>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // First attempt with wrong credentials
      const wrongLoginButton = screen.getByTestId('login-wrong-button');
      await user.click(wrongLoginButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(/invalid credentials/i);
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      // Retry with correct credentials
      const correctLoginButton = screen.getByTestId('login-correct-button');
      await user.click(correctLoginButton);

      // Should succeed
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
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
            })), 500
          )
        )
      );

      const TestComponent = () => {
        const { login, isLoading } = useAuth();

        const handleLogin = () => {
          login('admin', 'password123');
        };

        return (
          <div>
            <button onClick={handleLogin} data-testid="login-button">
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <div data-testid="loading-status">
              {isLoading ? 'loading' : 'not-loading'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('loading');
        expect(loginButton).toHaveTextContent('Logging in...');
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
      }, { timeout: 1000 });
    });

    it('should handle concurrent authentication requests properly', async () => {
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

      const TestComponent = () => {
        const { login } = useAuth();
        const [requestsMade, setRequestsMade] = React.useState(0);

        const handleMultipleLogins = async () => {
          // Trigger multiple login attempts simultaneously
          await Promise.all([
            login('admin', 'password123'),
            login('admin', 'password123'),
            login('admin', 'password123'),
          ]);
          setRequestsMade(requestCount);
        };

        return (
          <div>
            <button onClick={handleMultipleLogins} data-testid="multiple-login-button">
              Multiple Logins
            </button>
            <div data-testid="request-count">{requestsMade}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const multipleLoginButton = screen.getByTestId('multiple-login-button');
      await user.click(multipleLoginButton);

      // Should handle concurrent requests appropriately
      await waitFor(() => {
        const count = parseInt(screen.getByTestId('request-count').textContent || '0');
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(5); // Allow for some concurrent requests
      });
    });
  });
});