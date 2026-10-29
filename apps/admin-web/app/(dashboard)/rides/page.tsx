'use client';

import { useState } from 'react';
import { Search, Eye, XCircle, RotateCcw, Car, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { ridesApi } from '@/lib/api';
import toast from 'react-hot-toast';

const mockRides = [
  { id: 'r-001', client: 'Ahmed Ben Salah', driver: 'Karim Trabelsi', from: 'Avenue Bourguiba, Tunis', to: 'Lac 1, Tunis', fare: '8.50 TND', status: 'COMPLETED', method: 'CASH', date: '28/10/2026 14:32', country: 'TN' },
  { id: 'r-002', client: 'Sonia Mansouri', driver: 'Yassine Khelif', from: 'Bardo', to: 'La Marsa', fare: '22.00 TND', status: 'RIDE_STARTED', method: 'CARD', date: '28/10/2026 14:28', country: 'TN' },
  { id: 'r-003', client: 'Omar Farhat', driver: '—', from: 'Ariana', to: 'Menzah 5', fare: '11.00 TND', status: 'SEARCHING', method: 'WALLET', date: '28/10/2026 14:25', country: 'TN' },
  { id: 'r-004', client: 'Leila Hamdi', driver: 'Mourad Ayari', from: 'El Manar', to: 'Ennasr', fare: '7.00 TND', status: 'CANCELLED', method: 'CASH', date: '28/10/2026 14:18', country: 'TN' },
  { id: 'r-005', client: 'Khalil Rezgui', driver: 'Hatem Sellami', from: 'Carrefour', to: 'Mégrine', fare: '14.50 TND', status: 'PAYMENT_CONFIRMED', method: 'CARD', date: '28/10/2026 14:10', country: 'DZ' },
  { id: 'r-006', client: 'Faten Jebali', driver: 'Nabil Amri', from: 'Cité Olympique', to: 'Aouina', fare: '9.00 TND', status: 'ACCEPTED', method: 'CASH', date: '28/10/2026 14:05', country: 'MA' },
];

const statusConfig: Record<string, { label: string; cls: string }> = {
  COMPLETED:        { label: 'Complétée',  cls: 'badge-success' },
  PAYMENT_CONFIRMED:{ label: 'Payée',      cls: 'badge-success' },
  RIDE_STARTED:     { label: 'En cours',   cls: 'badge-info' },
  SEARCHING:        { label: 'Recherche',  cls: 'badge-warning' },
  ACCEPTED:         { label: 'Acceptée',   cls: 'badge-info' },
  DRIVER_EN_ROUTE:  { label: 'En route',   cls: 'badge-info' },
  DRIVER_ARRIVED:   { label: 'Arrivé',     cls: 'badge-info' },
  CANCELLED:        { label: 'Annulée',    cls: 'badge-danger' },
  NO_DRIVER:        { label: 'Aucun chauffeur', cls: 'badge-neutral' },
};

const methodConfig: Record<string, string> = {
  CASH: '💵 Espèces',
  CARD: '💳 Carte',
  WALLET: '👛 Wallet',
};

const countryFlag: Record<string, string> = {
  TN: '🇹🇳',
  DZ: '🇩🇿',
  MA: '🇲🇦',
};

export default function RidesPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filtered = mockRides.filter((r) => {
    const matchSearch =
      r.client.toLowerCase().includes(search.toLowerCase()) ||
      r.driver.toLowerCase().includes(search.toLowerCase()) ||
      r.id.includes(search);
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleCancel = (id: string) => {
    toast.promise(ridesApi.cancel(id, 'Annulation administrative'), {
      loading: 'Annulation...', success: 'Course annulée', error: 'Erreur',
    });
  };

  const handleRefund = (id: string) => {
    toast.promise(ridesApi.refund(id), {
      loading: 'Remboursement...', success: 'Remboursé ✅', error: 'Erreur',
    });
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Courses</h2>
          <p className="text-sm text-slate-500">{filtered.length} résultats</p>
        </div>
        <div className="flex gap-2">
          <span className="badge-info text-xs px-3 py-1.5"><Car size={10} className="inline mr-1" />6 actives</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Rechercher par client, chauffeur, ID..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'RIDE_STARTED', 'SEARCHING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx('btn btn-sm', filterStatus === s ? 'btn-primary' : 'btn-secondary')}>
              {s === 'ALL' ? 'Tous' : statusConfig[s]?.label || s}
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
                <th>ID</th>
                <th>Client</th>
                <th>Chauffeur</th>
                <th>Trajet</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Pays</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ride) => {
                const sc = statusConfig[ride.status] || { label: ride.status, cls: 'badge-neutral' };
                const isActive = ['RIDE_STARTED', 'SEARCHING', 'ACCEPTED', 'DRIVER_EN_ROUTE'].includes(ride.status);
                const isCompleted = ['COMPLETED', 'PAYMENT_CONFIRMED'].includes(ride.status);
                return (
                  <tr key={ride.id}>
                    <td className="font-mono text-xs text-slate-500">{ride.id}</td>
                    <td className="font-medium text-slate-700">{ride.client}</td>
                    <td className="text-slate-500 text-sm">{ride.driver}</td>
                    <td>
                      <div className="text-xs max-w-[160px]">
                        <div className="text-slate-600 truncate flex items-center gap-1">
                          <MapPin size={9} className="text-indigo-400 flex-shrink-0" />{ride.from}
                        </div>
                        <div className="text-slate-400 truncate mt-0.5">→ {ride.to}</div>
                      </div>
                    </td>
                    <td className="font-semibold text-slate-800">{ride.fare}</td>
                    <td className="text-xs text-slate-500">{methodConfig[ride.method]}</td>
                    <td className="text-base">{countryFlag[ride.country]}</td>
                    <td><span className={sc.cls}>{sc.label}</span></td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{ride.date}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <a href={`/rides/${ride.id}`} className="btn btn-ghost btn-sm p-1.5"><Eye size={13} /></a>
                        {isActive && (
                          <button onClick={() => handleCancel(ride.id)}
                            className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 p-1.5">
                            <XCircle size={13} />
                          </button>
                        )}
                        {isCompleted && (
                          <button onClick={() => handleRefund(ride.id)}
                            className="btn btn-sm bg-amber-50 text-amber-700 hover:bg-amber-100 p-1.5">
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
