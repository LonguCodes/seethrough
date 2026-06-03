'use client';

import { AlertCircle } from 'lucide-react';

interface AccessDeniedProps {
  title?: string;
  icon?: React.ReactNode;
}

export default function AccessDenied({ title, icon }: AccessDeniedProps) {
  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {title && (
        <header className="flex items-center gap-4 mb-12">
          {icon}
          <h1 className="text-4xl text-gradient">{title}</h1>
        </header>
      )}
      <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
        <AlertCircle size={48} className="text-[var(--danger)]" />
        <p className="text-slate-400 max-w-md">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}