'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthContextType } from '@/types/auth';

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = user !== null;

  // Verify token and get user data
  const verifyToken = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          return data.user;
        }
      }
      return null;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }, []);

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error('Erro de comunicação com o servidor');
      }

      console.log('🔍 [AUTH PROVIDER DEBUG] Response status:', response.status);
      console.log('🔍 [AUTH PROVIDER DEBUG] Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ [AUTH PROVIDER DEBUG] Login successful');
        setUser(data.user);
      } else {
        console.log('❌ [AUTH PROVIDER DEBUG] Login failed, processing error...');
        // Tratar diferentes tipos de erro baseado no status HTTP
        if (response.status === 429) {
          console.log('🔍 [AUTH PROVIDER DEBUG] Rate limited error');
          throw new Error('RATE_LIMITED');
        } else if (response.status === 401) {
          console.log('🔍 [AUTH PROVIDER DEBUG] Unauthorized error');
          throw new Error('Invalid credentials');
        } else if (response.status === 400) {
          console.log('🔍 [AUTH PROVIDER DEBUG] Bad request error');
          throw new Error(data.error || 'Dados inválidos');
        } else {
          console.log('🔍 [AUTH PROVIDER DEBUG] Other error');
          throw new Error(data.error || 'Erro no servidor');
        }
      }
    } catch (error) {
      // Se o erro já é uma instância de Error, apenas re-lança
      if (error instanceof Error) {
        throw error;
      }
      // Caso contrário, cria um novo erro
      throw new Error('Erro inesperado durante o login');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      // Redirect to login page
      window.location.href = '/login';
    }
  }, []);

  // Token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const userData = await verifyToken();
    if (userData) {
      setUser(userData);
      return true;
    } else {
      setUser(null);
      return false;
    }
  }, [verifyToken]);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      const userData = await verifyToken();
      setUser(userData);
      setIsLoading(false);
    };

    initializeAuth();
  }, [verifyToken]);

  // Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 30 minutes (token expires in 1 hour)
    const refreshInterval = setInterval(() => {
      refreshToken().catch((error) => {
        console.error('Token refresh failed:', error);
        setUser(null);
      });
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshToken]);

  // Handle visibility change to refresh token when tab becomes active
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshToken().catch((error) => {
          console.error('Token refresh on visibility change failed:', error);
          setUser(null);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, refreshToken]);

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;