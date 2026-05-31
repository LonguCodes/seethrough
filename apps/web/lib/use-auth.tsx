'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getAccessToken } from './auth';
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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    console.log('dadas')
    const token = getAccessToken();
    console.log(token)
    const parsed = parseUserFromToken(token);
    setUser(parsed);
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}