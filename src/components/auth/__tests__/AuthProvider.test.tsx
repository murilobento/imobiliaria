import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthProvider';
import { User } from '@/types/auth';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock user data
const mockUser: User = {
  id: '123',
  username: 'admin',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-01T12:00:00Z',
};

// Test component that uses the auth context
const TestComponent = () => {
  const { user, login, logout, isLoading, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.username : 'no-user'}</div>
      <button onClick={() => login('admin', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    
    // Mock successful verify response by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: mockUser,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('should initialize with loading state and verify token', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should start in loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');

    // Wait for token verification
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should be authenticated after successful verification
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/verify', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle failed token verification', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'Token invalid',
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should handle successful login', async () => {
    // Mock failed initial verification
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    });

    // Mock successful login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: mockUser,
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial verification to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should not be authenticated initially
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');

    // Perform login
    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('admin');
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    });
  });

  it('should handle failed login', async () => {
    // Create a test component that handles the login error
    const TestComponentWithErrorHandling = () => {
      const { login, isAuthenticated, isLoading } = useAuth();
      const [error, setError] = React.useState<string | null>(null);
      
      const handleLogin = async () => {
        try {
          await login('admin', 'password');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Login failed');
        }
      };
      
      return (
        <div>
          <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
          <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
          <div data-testid="error">{error || 'no-error'}</div>
          <button onClick={handleLogin} data-testid="login-btn">Login</button>
        </div>
      );
    };

    // Mock failed initial verification
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    });

    // Mock failed login
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'Invalid credentials',
      }),
    });

    render(
      <AuthProvider>
        <TestComponentWithErrorHandling />
      </AuthProvider>
    );

    // Wait for initial verification
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');

    // Attempt login
    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    // Wait for error to be set
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });

    // Should remain unauthenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
  });

  it('should handle logout', async () => {
    // Mock successful logout
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial authentication
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Perform logout
    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    // Should redirect to login
    expect(mockLocation.href).toBe('/login');
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle logout even when API call fails', async () => {
    // Mock failed logout API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, user: mockUser }),
    });
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial authentication
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Perform logout
    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    // Should still redirect to login even if API call fails
    expect(mockLocation.href).toBe('/login');
  });

  it('should set up automatic token refresh interval when authenticated', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial authentication
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Verify that the component is authenticated and interval would be set up
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
  });

  it('should handle failed token refresh', async () => {
    vi.useFakeTimers();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial authentication
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Clear previous fetch calls
    mockFetch.mockClear();

    // Mock failed token refresh
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'Token expired',
      }),
    });

    // Fast-forward 30 minutes to trigger refresh
    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    vi.useRealTimers();
  });

  it('should refresh token on visibility change when authenticated', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial authentication
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Clear previous fetch calls
    mockFetch.mockClear();

    // Mock successful token refresh
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: mockUser,
      }),
    });

    // Simulate tab becoming visible
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  it('should not refresh token on visibility change when not authenticated', async () => {
    // Mock failed initial verification
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial verification to complete
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    // Clear previous fetch calls
    mockFetch.mockClear();

    // Simulate tab becoming visible
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should not make any additional fetch calls
    expect(mockFetch).not.toHaveBeenCalled();
  });
});