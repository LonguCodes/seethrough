'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '../../lib/use-auth';

export function ClientLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}