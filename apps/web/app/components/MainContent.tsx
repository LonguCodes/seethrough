'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <main className={`flex-1 transition-all duration-300 min-h-screen overflow-x-hidden ${isLoginPage ? 'ml-0' : 'ml-72'}`}>
      {children}
    </main>
  );
}
