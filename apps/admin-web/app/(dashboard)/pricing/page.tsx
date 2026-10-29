'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Save, Plus, Trash2, Edit2, Globe } from 'lucide-react';

const PRICING_RULES = [
  { id: 'pr1', country: 'TN', currency: 'TND', flag: '🇹🇳', vehicleType: 'VTC Standard', baseFare: 1.50, perKm: 0.80, perMin: 0.10, minFare: 3.00, surgeMult: 1.5, isActive: true },
  { id: 'pr2', country: 'TN', currency: 'TND', flag: '🇹🇳', vehicleType: 'VTC Premium', baseFare: 3.00, perKm: 1.50, perMin: 0.20, minFare: 6.00, surgeMult: 1.8, isActive: true },
  { id: 'pr3', country: 'DZ', currency: 'DZD', flag: '🇩🇿', vehicleType: 'VTC Standard', baseFare: 100, perKm: 60, perMin: 8, minFare: 250, surgeMult: 1.5, isActive: true },
  { id: 'pr4', country: 'MA', currency: 'MAD', flag: '🇲🇦', vehicleType: 'VTC Standard', baseFare: 6.00, perKm: 3.50, perMin: 0.40, minFare: 12.00, surgeMult: 1.5, isActive: false },
];

const PROMO_CODES = [
  { code: 'BIENVENUE15', discount: '15%', type: 'PERCENT', maxUse: 1, used: 234, minRide: 5, expiry: '31/12/2026', isActive: true },
  { code: 'ETE2026', discount: '20%', type: 'PERCENT', maxUse: 3, used: 87, minRide: 8, expiry: '31/08/2026', isActive: false },
  { code: 'FLASH5', discount: '5 TND', type: 'FIXED', maxUse: 1, used: 45, minRide: 10, expiry: '30/11/2026', isActive: true },
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'promo'>('pricing');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tarification & Promos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gérez les tarifs par pays et les codes promotionnels</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nouvelle règle
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(['pricing', 'promo'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={clsx('px-5 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'pricing' ? '💰 Tarifs' : '🎁 Codes Promo'}
          </button>
        ))}
      </div>

      {activeTab === 'pricing' && (
        <div className="space-y-4">
          {/* Formula display */}
          <div className="card p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-indigo-600" />
              <span className="font-semibold text-indigo-800">Formule de tarification</span>
            </div>
            <code className="text-sm font-mono text-indigo-700">
              Tarif = max(tarif_min, base + (km × tarif_km) + (min × tarif_min)) × surge
            </code>
          </div>

          {/* Rules table */}
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pays</th>
                    <th>Véhicule</th>
                    <th>Base</th>
                    <th>Par km</th>
                    <th>Par min</th>
                    <th>Min fare</th>
                    <th>Surge max</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_RULES.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{rule.flag}</span>
                          <span className="text-xs font-medium text-slate-600">{rule.country}</span>
                        </div>
                      </td>
                      <td className="font-medium text-slate-700 text-sm">{rule.vehicleType}</td>
                      <td className="font-mono text-sm text-slate-700">{rule.baseFare} {rule.currency}</td>
                      <td className="font-mono text-sm text-slate-700">{rule.perKm} {rule.currency}</td>
                      <td className="font-mono text-sm text-slate-700">{rule.perMin} {rule.currency}</td>
                      <td className="font-mono text-sm font-semibold text-indigo-600">{rule.minFare} {rule.currency}</td>
                      <td>
                        <span className="font-semibold text-amber-600 text-sm">×{rule.surgeMult}</span>
                      </td>
                      <td>
                        <span className={clsx('badge', rule.isActive ? 'badge-success' : 'badge-neutral')}>
                          {rule.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <Edit2 size={13} className="text-slate-500" />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded-lg">
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'promo' && (
        <div className="card">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Codes promotionnels</h3>
            <button className="btn-primary btn-sm flex items-center gap-1.5">
              <Plus size={13} /> Créer un code
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Réduction</th>
                  <th>Type</th>
                  <th>Utilisations</th>
                  <th>Min. course</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {PROMO_CODES.map((promo) => (
                  <tr key={promo.code}>
                    <td>
                      <span className="font-mono font-bold text-indigo-600 text-sm bg-indigo-50 px-2 py-0.5 rounded-lg">
                        {promo.code}
                      </span>
                    </td>
                    <td className="font-bold text-emerald-600 text-sm">{promo.discount}</td>
                    <td>
                      <span className={clsx('badge text-xs', promo.type === 'PERCENT' ? 'badge-info' : 'badge-warning')}>
                        {promo.type === 'PERCENT' ? '% Pourcentage' : '🔖 Fixe'}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <span className="font-semibold text-slate-800">{promo.used}</span>
                        <span className="text-slate-400"> / {promo.maxUse === 1 ? '1 par user' : `${promo.maxUse}x`}</span>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600">{promo.minRide} TND min</td>
                    <td className="text-sm text-slate-500">{promo.expiry}</td>
                    <td>
                      <span className={clsx('badge', promo.isActive ? 'badge-success' : 'badge-neutral')}>
                        {promo.isActive ? '✅ Actif' : '⏸️ Pausé'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                          <Edit2 size={13} className="text-slate-500" />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
