'use client';

import { LayoutDashboard, Layers, Settings, Activity, Box, Cpu, HardDrive, Users, Shield, Key, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { hasPermission, PERMISSIONS, NAV_PERMISSION_MAP } from '../../lib/permissions';
import { useAuth } from '../../lib/use-auth';

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Layers, label: 'Cluster View', href: '/cluster' },
  { icon: HardDrive, label: 'Volumes', href: '/volumes' },
  { icon: Activity, label: 'Alert Rules', href: '/alerts' },
  { icon: User, label: 'My Profile', href: '/profile' },
  { icon: Users, label: 'Users', href: '/users' },
  { icon: Shield, label: 'Auth Methods', href: '/auth-methods' },
  { icon: Key, label: 'MFA', href: '/mfa' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === '/login' || pathname.startsWith('/invite/')) return null;

  // Filter menu items based on user permissions
  const visibleItems = ALL_MENU_ITEMS.filter((item) => {
    const requiredPerms = NAV_PERMISSION_MAP[item.href];
    if (!requiredPerms) return true;
    return requiredPerms.some((perm) => hasPermission(user, perm));
  });

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
        {visibleItems.map((item) => {
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

      <div className="p-6 space-y-2">
        <Link
          href="/profile"
          className="block bg-white/5 rounded-3xl p-5 border border-white/5 hover:bg-white/[0.07] transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
              <User size={14} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{user?.username ?? 'User'}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user?.role ?? 'unknown'}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">View Profile →</span>
        </Link>
        <button
          onClick={() => { logout(); window.location.href = '/login'; }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}