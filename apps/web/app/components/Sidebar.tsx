'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Layers, Settings, Activity, Server, Box, Cpu, HardDrive, Users, Shield } from 'lucide-react';

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Layers, label: 'Cluster View', href: '/cluster' },
  { icon: HardDrive, label: 'Volumes', href: '/volumes' },
  { icon: Activity, label: 'Alert Rules', href: '/alerts' },
  { icon: Users, label: 'Users', href: '/users' },
  { icon: Shield, label: 'SSO', href: '/sso' },
];

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname.startsWith('/invite/')) return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 glass border-r border-white/5 flex flex-col z-50">
      <div className="p-8 pb-12 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-glow)] flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]">
          <Cpu className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">SeeThrough</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4 px-4">Management</div>
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_0_20px_rgba(var(--accent-rgb),0.05)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon 
                size={20} 
                className={`transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} 
              />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Server size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-slate-300">Node Status</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500">System Load</span>
              <span className="text-slate-300 font-mono">Normal</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-[35%] bg-[var(--accent)] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
