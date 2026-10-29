'use client';

import dynamic from 'next/dynamic';
import { CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

const AreaChart = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart })), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => ({ default: m.Area })), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => ({ default: m.Bar })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });

const revenueData = [
  { day: 'Lun', revenue: 1240, rides: 48 },
  { day: 'Mar', revenue: 1890, rides: 72 },
  { day: 'Mer', revenue: 1450, rides: 55 },
  { day: 'Jeu', revenue: 2100, rides: 81 },
  { day: 'Ven', revenue: 2800, rides: 104 },
  { day: 'Sam', revenue: 3200, rides: 125 },
  { day: 'Dim', revenue: 2600, rides: 98 },
];

const rideStatusData = [
  { name: 'Complétées', value: 78, color: '#10b981' },
  { name: 'Annulées', value: 12, color: '#ef4444' },
  { name: 'En cours', value: 7, color: '#6366f1' },
  { name: 'Sans chauffeur', value: 3, color: '#f59e0b' },
];

const statCards = [
  { label: 'Courses en cours', value: '24', change: '+3 depuis hier', positive: true, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', emoji: '🚗' },
  { label: 'Chauffeurs en ligne', value: '87', change: '+12 depuis hier', positive: true, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', emoji: '🚕' },
  { label: "Revenus aujourd'hui", value: '3 240 TND', change: '+18% vs hier', positive: true, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', emoji: '💰' },
  { label: "Taux d'annulation", value: '4.2%', change: '-0.8% vs hier', positive: true, iconBg: 'bg-red-50', iconColor: 'text-red-500', emoji: '⚠️' },
];

const recentRides = [
  { id: '#8421', client: 'Ahmed B.', driver: 'Karim T.', from: 'Tunis Centre', to: 'Lac 1', fare: '8.50 TND', status: 'COMPLETED', time: '14:32' },
  { id: '#8420', client: 'Sonia M.', driver: 'Yassine K.', from: 'Bardo', to: 'La Marsa', fare: '22.00 TND', status: 'RIDE_STARTED', time: '14:28' },
  { id: '#8419', client: 'Omar F.', driver: '—', from: 'Ariana', to: 'Menzah 5', fare: '11.00 TND', status: 'SEARCHING', time: '14:25' },
  { id: '#8418', client: 'Leila H.', driver: 'Mourad A.', from: 'El Manar', to: 'Ennasr', fare: '7.00 TND', status: 'CANCELLED', time: '14:18' },
  { id: '#8417', client: 'Khaled R.', driver: 'Hatem S.', from: 'Carrefour', to: 'Mégrine', fare: '14.50 TND', status: 'COMPLETED', time: '14:10' },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: 'Complétée', className: 'badge-success' },
  RIDE_STARTED: { label: 'En cours', className: 'badge-info' },
  SEARCHING: { label: 'Recherche', className: 'badge-warning' },
  CANCELLED: { label: 'Annulée', className: 'badge-danger' },
  ACCEPTED: { label: 'Acceptée', className: 'badge-info' },
  DRIVER_EN_ROUTE: { label: 'En route', className: 'badge-info' },
};

export function OverviewClient() {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonjour 👋</h1>
          <p className="text-slate-500 mt-0.5 text-sm capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="status-online"></span>
          <span className="text-xs font-medium text-emerald-700">Système opérationnel</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card card-hover">
            <div className={clsx('stat-icon', card.iconBg)}>
              <span className="text-xl">{card.emoji}</span>
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-sm text-slate-500 mt-0.5 truncate">{card.label}</div>
              <div className={clsx('text-xs mt-1 font-medium', card.positive ? 'text-emerald-600' : 'text-red-500')}>
                {card.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Area Chart */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800">Revenus 7 jours</h3>
              <p className="text-xs text-slate-500 mt-0.5">7 derniers jours</p>
            </div>
            <span className="badge-success">
              <CheckCircle size={10} /> +18% ce mois
            </span>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  formatter={(val: number, name: string) => [
                    name === 'revenue' ? `${val} TND` : val,
                    name === 'revenue' ? 'Revenus' : 'Courses',
                  ]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Répartition Courses</h3>
          <p className="text-xs text-slate-500 mb-4">Aujourd'hui</p>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rideStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                  {rideStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val}%`, '']} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {rideStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Volume de Courses</h3>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }}
                formatter={(val: number) => [val, 'Courses']}
              />
              <Bar dataKey="rides" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Rides Table */}
      <div className="card">
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="font-semibold text-slate-800">Dernières Courses</h3>
          <a href="/rides" className="text-xs text-indigo-600 hover:underline font-medium">Voir tout →</a>
        </div>
        <div className="table-container mt-4">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Client</th><th>Chauffeur</th>
                <th>Trajet</th><th>Montant</th><th>Statut</th><th>Heure</th>
              </tr>
            </thead>
            <tbody>
              {recentRides.map((ride) => {
                const sc = statusConfig[ride.status] || { label: ride.status, className: 'badge-neutral' };
                return (
                  <tr key={ride.id}>
                    <td className="font-mono text-slate-500 text-xs">{ride.id}</td>
                    <td className="font-medium text-slate-700">{ride.client}</td>
                    <td className="text-slate-500">{ride.driver}</td>
                    <td>
                      <div className="text-xs text-slate-600 max-w-[180px]">
                        <div className="truncate">{ride.from}</div>
                        <div className="text-slate-400 truncate">→ {ride.to}</div>
                      </div>
                    </td>
                    <td className="font-semibold text-slate-800">{ride.fare}</td>
                    <td><span className={sc.className}>{sc.label}</span></td>
                    <td className="text-slate-400 text-xs">{ride.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4">
        {[
          { emoji: '⏱️', bgCls: 'bg-indigo-50', label: 'ETA moyen', value: '6.2 min', sub: "Temps d'attente client" },
          { emoji: '✅', bgCls: 'bg-emerald-50', label: 'Taux succès dispatch', value: '94.8%', sub: 'Courses attribuées' },
          { emoji: '📄', bgCls: 'bg-amber-50', label: 'Docs en attente', value: '8', sub: 'Chauffeurs à valider' },
        ].map((item) => (
          <div key={item.label} className="card p-5 flex items-center gap-4">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl', item.bgCls)}>
              {item.emoji}
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{item.value}</div>
              <div className="text-sm font-medium text-slate-700">{item.label}</div>
              <div className="text-xs text-slate-400">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
