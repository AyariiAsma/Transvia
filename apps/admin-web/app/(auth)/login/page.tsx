'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@demo.com',
    password: 'Demo@1234',
    flag: '🛡️',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    badge: 'bg-indigo-600',
  },
  {
    role: 'Superviseur',
    email: 'supervisor@demo.com',
    password: 'Demo@1234',
    flag: '👁️',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    badge: 'bg-slate-500',
  },
  {
    role: 'Support',
    email: 'support@demo.com',
    password: 'Demo@1234',
    flag: '🎧',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge: 'bg-emerald-600',
  },
];

// Token de démo JWT-like (valide uniquement pour le mode démo)
const DEMO_TOKEN = 'demo_admin_token_logisticapp_2024';

function setAuthCookie(token: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `admin_token=${token}; path=/; expires=${expires}; SameSite=Lax`;
  localStorage.setItem('admin_token', token);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const redirectTo = searchParams.get('from') || '/overview';

  // Vérifier si déjà connecté
  useEffect(() => {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const hasToken = cookies.some(c => c.startsWith('admin_token='));
    if (hasToken) router.push(redirectTo);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Essayer le backend réel d'abord
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(3000), // 3s timeout
        }
      );

      if (res.ok) {
        const data = await res.json();
        const token = data.data?.tokens?.accessToken || data.data?.accessToken;
        if (token) {
          setAuthCookie(token);
          router.push(redirectTo);
          return;
        }
      }

      if (res.status === 401 || res.status === 403) {
        setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
        return;
      }

      // Si serveur KO → mode démo
      await activateDemoMode();
    } catch {
      // Serveur non disponible → mode démo automatique
      await activateDemoMode();
    } finally {
      setIsLoading(false);
    }
  };

  const activateDemoMode = async () => {
    // Vérifier que les identifiants correspondent à un compte démo
    const demoAccount = DEMO_ACCOUNTS.find(
      (a) => a.email === email && a.password === password
    );

    if (!demoAccount) {
      setError('Identifiants incorrects. Utilisez un compte démo ci-dessous.');
      return;
    }

    // Activer le mode démo
    setIsDemoMode(true);
    setAuthCookie(DEMO_TOKEN);
    await new Promise((r) => setTimeout(r, 800)); // petite pause pour l'animation
    router.push(redirectTo);
  };

  const fillAccount = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)', transform: 'translate(30%, -30%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', transform: 'translate(-30%, 30%)' }}
      />
      <div
        className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-white/30 pointer-events-none"
        style={{ animation: 'pulse 2s infinite' }}
      />

      <div className="relative z-10 w-full max-w-md mx-4 py-8">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="text-4xl">🚗</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">LogisticApp</h1>
          <p className="text-white/60 mt-2 text-sm font-medium">Panneau d'Administration</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            {['🇹🇳 Tunisie', '🇩🇿 Algérie', '🇲🇦 Maroc'].map((c) => (
              <span key={c} className="text-xs text-white/50 font-medium">{c}</span>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <div
          className="rounded-3xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
        >
          <h2 className="text-xl font-bold text-slate-800 mb-1">Connexion</h2>
          <p className="text-sm text-slate-400 mb-6">
            Accédez au panneau d'administration
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <p className="text-red-600 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Demo mode banner */}
          {isDemoMode && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <span className="text-lg">🎭</span>
              <div>
                <p className="text-amber-700 text-sm font-semibold">Mode Démo activé</p>
                <p className="text-amber-600 text-xs">API non disponible. Données de démonstration.</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Adresse email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com"
                className="input"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>

            <button
              type="submit"
              id="btn-login"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-base mt-2 relative overflow-hidden"
              style={{ borderRadius: '16px' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </span>
              ) : (
                '🔐 Se connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">COMPTES DE DÉMONSTRATION</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Demo Accounts */}
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                id={`demo-${account.role.toLowerCase()}`}
                onClick={() => fillAccount(account)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all duration-150 hover:shadow-sm active:scale-[0.98] ${account.color}`}
              >
                <span className="text-xl flex-shrink-0">{account.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{account.role}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${account.badge}`}>
                      DÉMO
                    </span>
                  </div>
                  <div className="text-xs opacity-70 truncate">{account.email}</div>
                </div>
                <span className="text-xs opacity-50 flex-shrink-0">Cliquer pour remplir →</span>
              </button>
            ))}
          </div>

          {/* Info note */}
          <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
            💡 Si l'API backend n'est pas démarrée,<br />
            le mode démo s'active automatiquement.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          LogisticApp v1.0.0 · Administration sécurisée
        </p>
      </div>
    </main>
  );
}
