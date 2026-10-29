'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Save, Shield, Bell, Globe, Palette, Database, Key } from 'lucide-react';

const TABS = [
  { id: 'general', label: 'Général', icon: Globe },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'notifications', label: 'Alertes', icon: Bell },
  { id: 'appearance', label: 'Apparence', icon: Palette },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 800));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configuration de la plateforme LogisticApp</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card p-6 space-y-6">
          {activeTab === 'general' && (
            <>
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Paramètres généraux</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom de la plateforme</label>
                  <input className="input" defaultValue="LogisticApp" />
                </div>
                <div>
                  <label className="label">Email support</label>
                  <input className="input" type="email" defaultValue="support@logisticapp.com" />
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select className="input">
                    <option>Africa/Tunis (UTC+1)</option>
                    <option>Africa/Algiers (UTC+1)</option>
                    <option>Africa/Casablanca (UTC+1)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Langue par défaut</label>
                  <select className="input">
                    <option value="fr">Français 🇫🇷</option>
                    <option value="ar">Arabe 🇸🇦</option>
                    <option value="en">English 🇬🇧</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Pays actifs</label>
                <div className="flex gap-3">
                  {[{ flag: '🇹🇳', name: 'Tunisie', enabled: true }, { flag: '🇩🇿', name: 'Algérie', enabled: true }, { flag: '🇲🇦', name: 'Maroc', enabled: false }].map(c => (
                    <div key={c.name} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium', c.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500')}>
                      {c.flag} {c.name}
                      <span className={clsx('w-2 h-2 rounded-full ml-1', c.enabled ? 'bg-emerald-500' : 'bg-slate-300')} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Commission plateforme (%)</label>
                <div className="flex items-center gap-3">
                  <input className="input w-32" type="number" defaultValue={15} min={0} max={100} step={0.5} />
                  <span className="text-sm text-slate-500">% sur chaque course</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Sécurité & Authentification</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Durée de session JWT (heures)</label>
                  <input className="input w-40" type="number" defaultValue={24} />
                </div>
                <div>
                  <label className="label">OTP — Délai d'expiration (secondes)</label>
                  <input className="input w-40" type="number" defaultValue={120} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800 text-sm">Authentification 2FA Admin</div>
                    <div className="text-xs text-slate-500">Exiger un second facteur pour les admins</div>
                  </div>
                  <div className="w-10 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Key size={15} className="text-amber-600" />
                    <span className="font-medium text-amber-800 text-sm">API Keys</span>
                  </div>
                  <div className="font-mono text-xs text-amber-700 bg-amber-100 p-2 rounded-lg">
                    sk_live_••••••••••••••••••••••••••••••
                  </div>
                  <button className="btn-secondary btn-sm mt-2 text-xs">Régénérer la clé</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Alertes système</h3>
              <div className="space-y-3">
                {[
                  { label: 'Nouvelle inscription chauffeur', enabled: true },
                  { label: 'Course sans chauffeur > 5 min', enabled: true },
                  { label: 'Paiement échoué', enabled: true },
                  { label: 'Rapport journalier', enabled: false },
                  { label: 'Alerte fraude', enabled: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                    <div className={clsx('w-10 h-6 rounded-full relative cursor-pointer transition-colors', item.enabled ? 'bg-indigo-600' : 'bg-slate-300')}>
                      <div className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', item.enabled ? 'right-1' : 'left-1')} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Personnalisation</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Couleur principale</label>
                  <div className="flex gap-2">
                    {['#4F46E5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                      <button key={color} className={clsx('w-8 h-8 rounded-xl border-2 transition-all hover:scale-110', color === '#4F46E5' ? 'border-slate-800 scale-110' : 'border-transparent')}
                        style={{ background: color }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Mode d'affichage</label>
                  <div className="flex gap-3">
                    {['Clair ☀️', 'Sombre 🌙', 'Auto 🖥️'].map((m, i) => (
                      <button key={m} className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-all', i === 0 ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Save size={15} />
              {saved ? '✅ Sauvegardé !' : 'Sauvegarder les modifications'}
            </button>
            <button className="btn-secondary">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
}
