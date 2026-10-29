'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Car, Users, MapPin, CreditCard,
  Bell, Settings, LifeBuoy, BarChart3, Tag, LogOut,
  Truck, Shield,
} from 'lucide-react';
import { clsx } from 'clsx';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { href: '/overview', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/map', icon: MapPin, label: 'Carte Live' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/rides', icon: Car, label: 'Courses' },
      { href: '/drivers', icon: Truck, label: 'Chauffeurs' },
      { href: '/clients', icon: Users, label: 'Clients' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/payments', icon: CreditCard, label: 'Paiements' },
      { href: '/pricing', icon: BarChart3, label: 'Tarification' },
      { href: '/promo', icon: Tag, label: 'Codes Promo' },
    ],
  },
  {
    label: 'Système',
    items: [
      { href: '/notifications', icon: Bell, label: 'Notifications' },
      { href: '/support', icon: LifeBuoy, label: 'Support' },
      { href: '/admins', icon: Shield, label: 'Admins' },
      { href: '/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{ background: 'hsl(224 71% 4%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Truck size={18} className="text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">LogisticApp</div>
          <div className="text-slate-500 text-xs">Admin Panel</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-600">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx('sidebar-link', { active: isActive })}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">Super Admin</div>
            <div className="text-slate-500 text-xs truncate">admin@logisticapp.com</div>
          </div>
          <LogOut size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
