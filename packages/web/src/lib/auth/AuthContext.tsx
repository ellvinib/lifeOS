'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Auth Context Value
 */
interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Storage keys
 */
const ACCESS_TOKEN_KEY = 'lifeos_access_token';
const REFRESH_TOKEN_KEY = 'lifeos_refresh_token';
const USER_KEY = 'lifeos_user';

/**
 * API base URL
 * Use relative URL so Next.js rewrites can proxy to backend
 */
const API_URL = '';

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /**
   * Load user from localStorage on mount
   */
  useEffect(() => {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  /**
   * Login function
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();

        // Store tokens and user info
        localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        setAccessToken(data.tokens.accessToken);
        setUser(data.user);

        // Redirect to dashboard
        router.push('/finance');
      } catch (error) {
        console.error('[AuthContext] Login error:', error);
        throw error;
      }
    },
    [router]
  );

  /**
   * Register function
   */
  const register = useCallback(
    async (email: string, password: string, name: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();

        // Store tokens and user info
        localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        setAccessToken(data.tokens.accessToken);
        setUser(data.user);

        // Redirect to dashboard
        router.push('/finance');
      } catch (error) {
        console.error('[AuthContext] Register error:', error);
        throw error;
      }
    },
    [router]
  );

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    // Clear tokens and user from storage
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setAccessToken(null);
    setUser(null);

    // Redirect to login
    router.push('/auth/login');
  }, [router]);

  /**
   * Refresh token function
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedRefreshToken) {
        return false;
      }

      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!response.ok) {
        // Refresh token invalid or expired, logout
        logout();
        return false;
      }

      const data = await response.json();

      // Update tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);

      setAccessToken(data.tokens.accessToken);

      return true;
    } catch (error) {
      console.error('[AuthContext] Refresh token error:', error);
      logout();
      return false;
    }
  }, [logout]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication (redirects if not authenticated)
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}
