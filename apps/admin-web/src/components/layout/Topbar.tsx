'use client';

import { Bell, Search, RefreshCw, LogOut, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

const pageTitles: Record<string, string> = {
  '/overview': 'Dashboard',
  '/map': 'Carte Live',
  '/rides': 'Gestion des Courses',
  '/drivers': 'Gestion des Chauffeurs',
  '/clients': 'Gestion des Clients',
  '/payments': 'Paiements & Finance',
  '/pricing': 'Tarification',
  '/promo': 'Codes Promo',
  '/notifications': 'Notifications',
  '/support': 'Support & Litiges',
  '/admins': 'Administrateurs',
  '/settings': 'Paramètres',
};

// Profils démo selon le token
const DEMO_PROFILES: Record<string, { name: string; role: string; avatar: string; email: string }> = {
  'admin@demo.com': { name: 'Admin', role: 'Super Admin', avatar: '👨‍💼', email: 'admin@demo.com' },
  'supervisor@demo.com': { name: 'Superviseur', role: 'Superviseur', avatar: '👁️', email: 'supervisor@demo.com' },
  'support@demo.com': { name: 'Support', role: 'Agent Support', avatar: '🎧', email: 'support@demo.com' },
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || 'Admin';
  const [showMenu, setShowMenu] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsDemoMode(token === 'demo_admin_token_logisticapp_2024');
  }, []);

  // Fermer le menu si clic dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-slate-100 flex items-center gap-4 px-6">
      {/* Page title */}
      <h2 className="text-lg font-semibold text-slate-800 mr-auto">{title}</h2>

      {/* Demo banner */}
      {isDemoMode && (
        <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
          🎭 Mode Démo
        </span>
      )}

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search size={15} className="absolute left-3 text-slate-400" />
        <input
          id="topbar-search"
          type="search"
          placeholder="Rechercher..."
          className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl w-56
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Refresh */}
      <button
        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        title="Rafraîchir"
        onClick={() => window.location.reload()}
      >
        <RefreshCw size={16} />
      </button>

      {/* Notifications */}
      <button
        id="btn-notifications"
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        title="Notifications"
      >
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      </button>

      {/* User Avatar + Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          id="btn-user-menu"
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            A
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-slate-800 leading-tight">Admin</div>
            <div className="text-xs text-slate-400 leading-tight">Super Admin</div>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up">
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Admin</div>
                  <div className="text-xs text-slate-400">admin@demo.com</div>
                </div>
              </div>
              {isDemoMode && (
                <div className="mt-2 px-2 py-1 bg-amber-50 rounded-lg text-xs text-amber-600 font-medium text-center">
                  🎭 Mode Démo actif
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors text-left"
                onClick={() => { setShowMenu(false); router.push('/settings'); }}
              >
                ⚙️ <span>Paramètres</span>
              </button>
            </div>

            {/* Logout */}
            <div className="p-1 border-t border-slate-50 mt-1">
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut size={15} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
