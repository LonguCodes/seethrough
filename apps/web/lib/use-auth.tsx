'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getAccessToken, clearTokens } from './auth';
import type { AuthUser } from './permissions';
import {jwtDecode} from "jwt-decode";

function parseUserFromToken(token: string | undefined): AuthUser | null {
  if (!token) return null;
  const payload = jwtDecode<AuthUser & {sub: string} >(token);
  if (!payload || !payload.sub) return null;
  return {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    permissions: payload.permissions ?? [],
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    const parsed = parseUserFromToken(token);
    setUser(parsed);
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}