'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

// Positions simulées en temps réel
const INITIAL_DRIVERS = [
  { id: 'd1', name: 'Karim T.', lat: 36.8065, lng: 10.1815, status: 'ONLINE', rideStatus: 'WAITING', rides: 7, flag: '🇹🇳' },
  { id: 'd2', name: 'Yassine K.', lat: 36.8125, lng: 10.1950, status: 'ONLINE', rideStatus: 'RIDE_STARTED', rides: 5, flag: '🇹🇳' },
  { id: 'd3', name: 'Mourad A.', lat: 36.7985, lng: 10.1720, status: 'ONLINE', rideStatus: 'DRIVER_EN_ROUTE', rides: 9, flag: '🇹🇳' },
  { id: 'd4', name: 'Hatem S.', lat: 36.8200, lng: 10.1600, status: 'OFFLINE', rideStatus: 'OFFLINE', rides: 0, flag: '🇹🇳' },
  { id: 'd5', name: 'Ahmed R.', lat: 36.7900, lng: 10.1900, status: 'ONLINE', rideStatus: 'WAITING', rides: 3, flag: '🇹🇳' },
];

const ACTIVE_RIDES = [
  { id: '#8420', client: 'Sonia M.', driver: 'Yassine K.', from: 'Bardo', to: 'La Marsa', eta: '8 min', fare: '22.00 TND', status: 'RIDE_STARTED' },
  { id: '#8421', client: 'Ahmed B.', driver: 'Mourad A.', from: 'Tunis Centre', to: 'Lac 1', eta: '3 min', fare: '8.50 TND', status: 'DRIVER_EN_ROUTE' },
  { id: '#8422', client: 'Leila H.', driver: '—', from: 'Ariana', to: 'Menzah', eta: 'Recherche...', fare: '12.00 TND', status: 'SEARCHING' },
];

const statusDotCls: Record<string, string> = {
  WAITING: 'bg-emerald-500',
  RIDE_STARTED: 'bg-indigo-500 animate-pulse',
  DRIVER_EN_ROUTE: 'bg-amber-500 animate-pulse',
  OFFLINE: 'bg-slate-400',
  SEARCHING: 'bg-red-400 animate-pulse',
};

export default function MapPage() {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Simuler des mises à jour de position
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers((prev) =>
        prev.map((d) =>
          d.status === 'ONLINE'
            ? { ...d, lat: d.lat + (Math.random() - 0.5) * 0.001, lng: d.lng + (Math.random() - 0.5) * 0.001 }
            : d
        )
      );
      setTick((t) => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = drivers.filter((d) => d.status === 'ONLINE').length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carte Live</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Mise à jour toutes les 3s · <span className="text-emerald-600 font-medium">{onlineCount} chauffeurs en ligne</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">Live · tick #{tick}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map placeholder (en prod = Google Maps / Mapbox) */}
        <div className="xl:col-span-2 card overflow-hidden" style={{ height: 520 }}>
          {/* Carte simulée avec grid */}
          <div className="relative w-full h-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center overflow-hidden">
            {/* Grid lines simulant une carte */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Routes simulées */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-full h-0.5 bg-white" style={{ transform: 'rotate(-15deg)' }} />
              <div className="absolute w-0.5 h-full bg-white" style={{ transform: 'rotate(20deg)' }} />
              <div className="absolute w-3/4 h-0.5 bg-white/50" style={{ transform: 'rotate(5deg) translateY(-80px)' }} />
            </div>

            {/* Zone centrale ville */}
            <div className="absolute w-32 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <span className="text-white/40 text-xs font-medium">Tunis Centre</span>
            </div>

            {/* Marqueurs chauffeurs */}
            {drivers.map((d, i) => {
              const x = 40 + (i * 80) + Math.sin(i) * 20;
              const y = 100 + (i * 60) + Math.cos(i) * 30;
              const isSelected = selectedDriver === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDriver(isSelected ? null : d.id)}
                  className={clsx(
                    'absolute flex flex-col items-center gap-1 transition-all duration-300',
                    isSelected ? 'z-20 scale-110' : 'z-10 hover:scale-105'
                  )}
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  {/* Bulle chauffeur */}
                  <div className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-lg text-white text-xs font-semibold',
                    d.status === 'OFFLINE' ? 'bg-slate-600' : 'bg-indigo-600',
                    isSelected ? 'ring-2 ring-white' : ''
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDotCls[d.rideStatus])} />
                    {d.flag} {d.name}
                  </div>
                  {/* Pointe */}
                  <div className={clsx('w-0 h-0 -mt-0.5', d.status === 'OFFLINE'
                    ? 'border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600'
                    : 'border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-indigo-600'
                  )} />
                </button>
              );
            })}

            {/* Marqueurs courses actives */}
            {ACTIVE_RIDES.filter(r => r.status === 'SEARCHING').map((r, i) => (
              <div
                key={r.id}
                className="absolute flex items-center gap-1 px-2 py-1 bg-red-500/90 rounded-lg text-white text-xs font-semibold animate-pulse"
                style={{ right: `${40 + i * 30}px`, bottom: `${60 + i * 20}px` }}
              >
                🔍 {r.id}
              </div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-black/50 backdrop-blur-sm rounded-xl p-3">
              {[
                { color: 'bg-emerald-500', label: 'En attente' },
                { color: 'bg-indigo-500', label: 'En course' },
                { color: 'bg-amber-500', label: 'En route' },
                { color: 'bg-red-400', label: 'Recherche' },
                { color: 'bg-slate-400', label: 'Hors ligne' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className={clsx('w-2 h-2 rounded-full', l.color)} />
                  <span className="text-white/80 text-xs">{l.label}</span>
                </div>
              ))}
            </div>

            <div className="absolute top-4 right-4 text-white/30 text-xs">
              🗺️ Carte en mode démo (Google Maps en production)
            </div>
          </div>
        </div>

        {/* Panneau droit */}
        <div className="flex flex-col gap-4">
          {/* Courses actives */}
          <div className="card p-4 flex-1">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              🚗 Courses actives
              <span className="badge-info">{ACTIVE_RIDES.length}</span>
            </h3>
            <div className="space-y-2.5">
              {ACTIVE_RIDES.map((ride) => (
                <div key={ride.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-slate-400">{ride.id}</span>
                    <span className="font-semibold text-indigo-600 text-sm">{ride.fare}</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-1">
                    <span className="font-medium">{ride.client}</span> → {ride.driver !== '—' ? ride.driver : <span className="text-red-400">Recherche...</span>}
                  </div>
                  <div className="text-xs text-slate-400">{ride.from} → {ride.to}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={clsx('badge text-xs', ride.status === 'SEARCHING' ? 'badge-danger' : ride.status === 'RIDE_STARTED' ? 'badge-success' : 'badge-warning')}>
                      {ride.status}
                    </span>
                    <span className="text-xs text-slate-400">ETA: {ride.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chauffeurs en ligne */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              🚕 Chauffeurs en ligne
              <span className="badge-success">{onlineCount}</span>
            </h3>
            <div className="space-y-2">
              {drivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDriver(selectedDriver === d.id ? null : d.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all',
                    selectedDriver === d.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                  )}
                >
                  <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', statusDotCls[d.rideStatus])} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{d.flag} {d.name}</div>
                    <div className="text-xs text-slate-400">{d.rides} courses · {d.rideStatus}</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {d.lat.toFixed(4)},<br />{d.lng.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
