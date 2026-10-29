'use client';

import { useState } from 'react';
import { Search, Filter, MoreVertical, Eye, Ban, CheckCircle, Phone, Mail, MapPin, Star } from 'lucide-react';
import { clsx } from 'clsx';

const MOCK_CLIENTS = [
  { id: 'c-001', firstName: 'Ahmed', lastName: 'Benali', phone: '+216 22 123 456', email: 'ahmed.b@mail.com', country: 'TN', city: 'Tunis', totalRides: 47, wallet: 28.50, rating: 4.8, isActive: true, joinedAt: '2024-03-12' },
  { id: 'c-002', firstName: 'Sonia', lastName: 'Mansouri', phone: '+216 55 987 654', email: 'sonia.m@mail.com', country: 'TN', city: 'Sfax', totalRides: 23, wallet: 0, rating: 4.5, isActive: true, joinedAt: '2024-05-18' },
  { id: 'c-003', firstName: 'Omar', lastName: 'Farhat', phone: '+213 555 123 456', email: 'omar.f@mail.com', country: 'DZ', city: 'Alger', totalRides: 8, wallet: 150.00, rating: 4.9, isActive: false, joinedAt: '2024-07-02' },
  { id: 'c-004', firstName: 'Leila', lastName: 'Hamdi', phone: '+212 661 234 567', email: 'leila.h@mail.com', country: 'MA', city: 'Casablanca', totalRides: 112, wallet: 45.20, rating: 4.7, isActive: true, joinedAt: '2023-11-25' },
  { id: 'c-005', firstName: 'Khaled', lastName: 'Riahi', phone: '+216 98 765 432', email: 'khaled.r@mail.com', country: 'TN', city: 'Sousse', totalRides: 34, wallet: 12.75, rating: 3.9, isActive: true, joinedAt: '2024-01-08' },
  { id: 'c-006', firstName: 'Fatima', lastName: 'Zohra', phone: '+213 770 456 789', email: 'fatima.z@mail.com', country: 'DZ', city: 'Oran', totalRides: 5, wallet: 0, rating: 5.0, isActive: true, joinedAt: '2024-09-14' },
];

const COUNTRIES: Record<string, { flag: string; currency: string }> = {
  TN: { flag: '🇹🇳', currency: 'TND' },
  DZ: { flag: '🇩🇿', currency: 'DZD' },
  MA: { flag: '🇲🇦', currency: 'MAD' },
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'banned'>('all');

  const filtered = MOCK_CLIENTS.filter((c) => {
    const matchSearch =
      `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && c.isActive) ||
      (filterActive === 'banned' && !c.isActive);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{MOCK_CLIENTS.length} clients inscrits</p>
        </div>
        <button className="btn-primary">
          + Exporter CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total clients', value: '1 248', sub: '+24 ce mois', color: 'bg-indigo-50', emoji: '👥' },
          { label: 'Actifs 30j', value: '834', sub: '66.8% du total', color: 'bg-emerald-50', emoji: '✅' },
          { label: 'Wallet total', value: '12 450 TND', sub: 'Soldes clients', color: 'bg-amber-50', emoji: '💳' },
          { label: 'Note moyenne', value: '4.7 ⭐', sub: 'Satisfaction', color: 'bg-purple-50', emoji: '⭐' },
        ].map((s) => (
          <div key={s.label} className={clsx('card p-4 flex items-center gap-3', s.color)}>
            <span className="text-2xl">{s.emoji}</span>
            <div>
              <div className="font-bold text-slate-900 text-lg leading-tight">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-xs text-emerald-600 font-medium">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, téléphone, email..."
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'banned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                filterActive === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {f === 'all' ? 'Tous' : f === 'active' ? '✅ Actifs' : '🚫 Bannis'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Pays</th>
                <th>Courses</th>
                <th>Wallet</th>
                <th>Note</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const country = COUNTRIES[client.country];
                return (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                          {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">
                            {client.firstName} {client.lastName}
                          </div>
                          <div className="text-xs text-slate-400">{client.city}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone size={11} /> {client.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail size={11} /> {client.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-lg">{country?.flag}</span>
                      <span className="text-xs text-slate-500 ml-1">{client.country}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800">{client.totalRides}</span>
                      <span className="text-xs text-slate-400 ml-1">courses</span>
                    </td>
                    <td>
                      <span className={clsx('font-medium text-sm', client.wallet > 0 ? 'text-emerald-600' : 'text-slate-400')}>
                        {client.wallet.toFixed(2)} {country?.currency}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="font-medium text-slate-700 text-sm">{client.rating}</span>
                      </div>
                    </td>
                    <td>
                      <span className={clsx('badge', client.isActive ? 'badge-success' : 'badge-danger')}>
                        {client.isActive ? '✅ Actif' : '🚫 Banni'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Voir profil">
                          <Eye size={14} className="text-slate-500" />
                        </button>
                        <button
                          className={clsx('p-1.5 rounded-lg transition-colors', client.isActive
                            ? 'hover:bg-red-50 text-red-400'
                            : 'hover:bg-emerald-50 text-emerald-500')}
                          title={client.isActive ? 'Bannir' : 'Réactiver'}
                        >
                          {client.isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreVertical size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50">
          <span className="text-xs text-slate-400">{filtered.length} résultats</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((p) => (
              <button key={p} className={clsx('w-7 h-7 rounded-lg text-xs font-medium', p === 1 ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
