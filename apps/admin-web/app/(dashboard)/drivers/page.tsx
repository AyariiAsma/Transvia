'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, MoreVertical, Eye, CheckCircle, XCircle, Ban, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { driversApi } from '@/lib/api';
import { clsx } from 'clsx';

// Mock data
const mockDrivers = [
  { id: '1', user: { firstName: 'Karim', lastName: 'Trabelsi', phone: '+21655000001', avatarUrl: null }, status: 'APPROVED', isOnline: true, ratingAvg: 4.8, totalRides: 245, vehicle: { make: 'Volkswagen', model: 'Polo', plateNumber: '123 TN 4567' }, documents: [], earningsTotal: 12500 },
  { id: '2', user: { firstName: 'Yassine', lastName: 'Khelif', phone: '+21655000002', avatarUrl: null }, status: 'PENDING', isOnline: false, ratingAvg: 0, totalRides: 0, vehicle: { make: 'Renault', model: 'Symbol', plateNumber: '456 TN 7890' }, documents: [], earningsTotal: 0 },
  { id: '3', user: { firstName: 'Mourad', lastName: 'Ayari', phone: '+21655000003', avatarUrl: null }, status: 'APPROVED', isOnline: false, ratingAvg: 4.5, totalRides: 128, vehicle: { make: 'Peugeot', model: '301', plateNumber: '789 TN 1234' }, documents: [], earningsTotal: 6800 },
  { id: '4', user: { firstName: 'Hatem', lastName: 'Sellami', phone: '+21655000004', avatarUrl: null }, status: 'SUSPENDED', isOnline: false, ratingAvg: 3.2, totalRides: 42, vehicle: { make: 'Hyundai', model: 'Accent', plateNumber: '321 TN 5678' }, documents: [], earningsTotal: 1900 },
];

const statusConfig = {
  APPROVED:  { label: 'Approuvé',  className: 'badge-success' },
  PENDING:   { label: 'En attente', className: 'badge-warning' },
  SUSPENDED: { label: 'Suspendu',  className: 'badge-danger' },
  REJECTED:  { label: 'Rejeté',    className: 'badge-neutral' },
};

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const qc = useQueryClient();

  const drivers = mockDrivers.filter((d) => {
    const name = `${d.user.firstName} ${d.user.lastName}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || d.user.phone.includes(search);
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (id: string) => {
    toast.promise(
      driversApi.updateStatus(id, 'APPROVED'),
      { loading: 'Approbation...', success: 'Chauffeur approuvé ✅', error: 'Erreur' },
    );
  };

  const handleSuspend = async (id: string) => {
    toast.promise(
      driversApi.updateStatus(id, 'SUSPENDED'),
      { loading: 'Suspension...', success: 'Chauffeur suspendu', error: 'Erreur' },
    );
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Chauffeurs</h2>
          <p className="text-sm text-slate-500">{drivers.length} chauffeurs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-success text-xs px-3 py-1.5">
            <span className="status-online mr-1"></span>
            87 en ligne
          </span>
          <span className="badge-warning text-xs px-3 py-1.5">8 en attente</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search" placeholder="Rechercher un chauffeur..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {['ALL', 'APPROVED', 'PENDING', 'SUSPENDED'].map((s) => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx('btn btn-sm', filterStatus === s ? 'btn-primary' : 'btn-secondary')}>
              {s === 'ALL' ? 'Tous' : statusConfig[s as keyof typeof statusConfig]?.label || s}
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
                <th>Chauffeur</th>
                <th>Véhicule</th>
                <th>Statut</th>
                <th>Présence</th>
                <th>Note</th>
                <th>Courses</th>
                <th>Gains totaux</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const sc = statusConfig[driver.status as keyof typeof statusConfig];
                return (
                  <tr key={driver.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                            {driver.user.firstName[0]}{driver.user.lastName[0]}
                          </div>
                          {driver.isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">
                            {driver.user.firstName} {driver.user.lastName}
                          </div>
                          <div className="text-xs text-slate-400">{driver.user.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-700">{driver.vehicle.make} {driver.vehicle.model}</div>
                      <div className="text-xs text-slate-400 font-mono">{driver.vehicle.plateNumber}</div>
                    </td>
                    <td><span className={sc?.className}>{sc?.label}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className={driver.isOnline ? 'status-online' : 'status-offline'}></span>
                        <span className="text-xs text-slate-500">{driver.isOnline ? 'En ligne' : 'Hors ligne'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400">★</span>
                        <span className="font-medium text-slate-700">{driver.ratingAvg.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="font-medium text-slate-700">{driver.totalRides}</td>
                    <td className="font-semibold text-slate-800">
                      {driver.earningsTotal.toLocaleString()} TND
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <a href={`/drivers/${driver.id}`} className="btn btn-ghost btn-sm p-1.5" title="Voir">
                          <Eye size={14} />
                        </a>
                        {driver.status === 'PENDING' && (
                          <button onClick={() => handleApprove(driver.id)}
                            className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-1.5" title="Approuver">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {driver.status === 'APPROVED' && (
                          <button onClick={() => handleSuspend(driver.id)}
                            className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 p-1.5" title="Suspendre">
                            <Ban size={14} />
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
