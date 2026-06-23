'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'superadmin';
  schoolId?: string;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const TOKEN_KEY = 'smartvan_token';
const USER_KEY = 'smartvan_user';

// ─── Safe localStorage helpers (avoid SSR crash) ──────────────────────────────

function getLS(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function setLS(key: string, val: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, val); } catch {}
}

function removeLS(key: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = getLS(TOKEN_KEY);
    const userRaw = getLS(USER_KEY);

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AdminUser;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setState({ user, token, isLoading: false, isAuthenticated: true });
      } catch {
        clearAuth();
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  function clearAuth() {
    removeLS(TOKEN_KEY);
    removeLS(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await api.post('/Admin/login', { email, password });
        const { token, data } = res.data;

        if (!token) {
          return { success: false, error: 'Invalid response from server.' };
        }

        setLS(TOKEN_KEY, token);
        setLS(USER_KEY, JSON.stringify(data ?? {}));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        setState({ user: data ?? null, token, isLoading: false, isAuthenticated: true });
        return { success: true };
      } catch (err: any) {
        const message = err?.response?.data?.message ?? 'Login failed. Check your credentials.';
        return { success: false, error: message };
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuth();
    router.push('/login');
  }, [router]);

  const refreshProfile = useCallback(async () => {
    const token = getLS(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await api.get('/Admin/getProfile');
      const user = res.data?.data;
      if (user) {
        setLS(USER_KEY, JSON.stringify(user));
        setState((s) => ({ ...s, user }));
      }
    } catch {
      // silently fail
    }
  }, []);

  return { ...state, login, logout, refreshProfile };
}
