'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname.startsWith('/invite/');

  return (
    <main className={`flex-1 transition-all duration-300 min-h-screen overflow-x-hidden ${isAuthPage ? 'ml-0' : 'ml-72'}`}>
      {children}
    </main>
  );
}
