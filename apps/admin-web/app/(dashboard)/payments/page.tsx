'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Download, CreditCard, Wallet, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const AreaChart = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart })), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => ({ default: m.Area })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });

const revenueData = [
  { month: 'Juin', revenue: 28400, payouts: 21300, net: 7100 },
  { month: 'Juil', revenue: 34200, payouts: 25650, net: 8550 },
  { month: 'Août', revenue: 31800, payouts: 23850, net: 7950 },
  { month: 'Sep', revenue: 42100, payouts: 31575, net: 10525 },
  { month: 'Oct', revenue: 38600, payouts: 28950, net: 9650 },
  { month: 'Nov', revenue: 51200, payouts: 38400, net: 12800 },
  { month: 'Déc', revenue: 46800, payouts: 35100, net: 11700 },
];

const TRANSACTIONS = [
  { id: 'T-8421', type: 'RIDE', description: 'Course #8421 — Tunis Centre → Lac 1', client: 'Ahmed B.', amount: 8.50, commission: 1.28, currency: 'TND', status: 'COMPLETED', date: '28/10 14:32' },
  { id: 'T-8420', type: 'RIDE', description: 'Course #8420 — Bardo → La Marsa', client: 'Sonia M.', amount: 22.00, commission: 3.30, currency: 'TND', status: 'COMPLETED', date: '28/10 14:28' },
  { id: 'T-8419', type: 'REFUND', description: 'Remboursement course #8415', client: 'Omar F.', amount: -11.00, commission: 0, currency: 'TND', status: 'REFUNDED', date: '28/10 13:15' },
  { id: 'T-8418', type: 'PAYOUT', description: 'Virement chauffeur Karim T.', client: 'Karim T.', amount: -180.50, commission: 0, currency: 'TND', status: 'PAID', date: '28/10 12:00' },
  { id: 'T-8417', type: 'RIDE', description: 'Course #8417 — Carrefour → Mégrine', client: 'Khaled R.', amount: 14.50, commission: 2.18, currency: 'TND', status: 'COMPLETED', date: '28/10 11:47' },
  { id: 'T-8416', type: 'PROMO', description: 'Code promo BIENVENUE15 appliqué', client: 'Fatima Z.', amount: -3.50, commission: 0, currency: 'TND', status: 'APPLIED', date: '28/10 11:20' },
];

const statusCls: Record<string, string> = {
  COMPLETED: 'badge-success',
  REFUNDED: 'badge-warning',
  PAID: 'badge-info',
  APPLIED: 'badge-neutral',
  PENDING: 'badge-warning',
};

const typeEmoji: Record<string, string> = {
  RIDE: '🚗', REFUND: '↩️', PAYOUT: '💸', PROMO: '🎁',
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<'overview' | 'transactions' | 'payouts'>('overview');

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements & Finance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Octobre 2026 — 3 pays</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Exporter rapport
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Revenus ce mois', value: '46 800 TND', change: '+12.4%', up: true, icon: '💰', color: 'bg-indigo-50' },
          { label: 'Commissions nettes', value: '11 700 TND', change: '+8.1%', up: true, icon: '📊', color: 'bg-emerald-50' },
          { label: 'Virements chauffeurs', value: '35 100 TND', change: '+14.2%', up: true, icon: '💸', color: 'bg-amber-50' },
          { label: 'Remboursements', value: '1 240 TND', change: '-3.8%', up: false, icon: '↩️', color: 'bg-red-50' },
        ].map((kpi) => (
          <div key={kpi.label} className={clsx('card p-5', kpi.color)}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{kpi.icon}</span>
              <span className={clsx('flex items-center gap-0.5 text-xs font-semibold', kpi.up ? 'text-emerald-600' : 'text-red-500')}>
                {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpi.change}
              </span>
            </div>
            <div className="text-xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(['overview', 'transactions', 'payouts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            {t === 'overview' ? '📊 Revenus' : t === 'transactions' ? '📋 Transactions' : '💸 Virements'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800">Évolution financière</h3>
              <p className="text-xs text-slate-400 mt-0.5">Revenus, virements et commissions — 7 derniers mois</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  formatter={(val: number, name: string) => [`${val.toLocaleString()} TND`, name === 'revenue' ? 'Revenus' : name === 'net' ? 'Commission nette' : 'Virements']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gRevenue)" />
                <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} fill="url(#gNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex gap-6 justify-center mt-4">
            {[
              { color: '#6366f1', label: 'Revenus bruts' },
              { color: '#10b981', label: 'Commissions nettes' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                <span className="text-xs text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="card">
          <div className="p-4 border-b border-slate-50">
            <h3 className="font-semibold text-slate-800">Transactions récentes</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Description</th>
                  <th>Utilisateur</th><th>Montant</th><th>Commission</th>
                  <th>Statut</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-mono text-xs text-slate-400">{tx.id}</td>
                    <td>
                      <span className="text-base">{typeEmoji[tx.type]}</span>
                    </td>
                    <td className="text-sm text-slate-600 max-w-[220px] truncate">{tx.description}</td>
                    <td className="text-sm text-slate-700 font-medium">{tx.client}</td>
                    <td className={clsx('font-semibold text-sm', tx.amount > 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="text-sm text-slate-500">
                      {tx.commission > 0 ? `${tx.commission.toFixed(2)} ${tx.currency}` : '—'}
                    </td>
                    <td><span className={statusCls[tx.status] || 'badge-neutral'}>{tx.status}</span></td>
                    <td className="text-xs text-slate-400">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {tab === 'payouts' && (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Virements en attente</h3>
          <div className="space-y-3">
            {[
              { driver: 'Karim Touati', amount: 320.50, rides: 41, currency: 'TND', flag: '🇹🇳', status: 'PENDING' },
              { driver: 'Yassine Khelifi', amount: 280.00, rides: 35, currency: 'TND', flag: '🇹🇳', status: 'PENDING' },
              { driver: 'Mourad Amiri', amount: 4500.00, rides: 28, currency: 'DZD', flag: '🇩🇿', status: 'PROCESSING' },
              { driver: 'Hassan Bennani', amount: 1850.00, rides: 22, currency: 'MAD', flag: '🇲🇦', status: 'PENDING' },
            ].map((p) => (
              <div key={p.driver} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl">{p.flag}</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{p.driver}</div>
                  <div className="text-xs text-slate-400">{p.rides} courses ce mois</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{p.amount.toLocaleString()} {p.currency}</div>
                  <span className={clsx('badge text-xs', p.status === 'PROCESSING' ? 'badge-info' : 'badge-warning')}>
                    {p.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm">Virer</button>
                  <button className="btn-secondary btn-sm">Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
