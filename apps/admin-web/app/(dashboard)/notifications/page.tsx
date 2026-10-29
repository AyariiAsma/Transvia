'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Bell, Send, Users, User, CheckCheck } from 'lucide-react';

const NOTIFICATION_HISTORY = [
  { id: 'n1', title: 'Maintenance planifiée', body: 'LogisticApp sera indisponible le 30/10 de 02h à 04h.', target: 'ALL', sent: 1248, read: 892, date: '28/10 09:00' },
  { id: 'n2', title: 'Bienvenue nouveau chauffeur !', body: 'Votre compte a été approuvé. Bonne route !', target: 'DRIVERS', sent: 87, read: 71, date: '27/10 14:30' },
  { id: 'n3', title: 'Offre weekend -20%', body: 'Ce weekend, profitez de 20% de réduction sur toutes vos courses.', target: 'CLIENTS', sent: 1161, read: 634, date: '25/10 10:00' },
  { id: 'n4', title: 'Mise à jour application', body: 'La version 1.2.0 est disponible avec de nouvelles fonctionnalités.', target: 'ALL', sent: 1248, read: 1100, date: '20/10 16:00' },
];

const targetOptions = [
  { value: 'ALL', label: 'Tous les utilisateurs', icon: '👥' },
  { value: 'CLIENTS', label: 'Clients uniquement', icon: '👤' },
  { value: 'DRIVERS', label: 'Chauffeurs uniquement', icon: '🚗' },
  { value: 'SPECIFIC', label: 'Utilisateur spécifique', icon: '🎯' },
];

export default function NotificationsPage() {
  const [target, setTarget] = useState('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSending(false);
    setSent(true);
    setTitle('');
    setBody('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications Push</h1>
          <p className="text-sm text-slate-500 mt-0.5">Envoyez des notifications à vos utilisateurs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Composer */}
        <div className="xl:col-span-2 card p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Bell size={16} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Nouvelle notification</h3>
          </div>

          {sent && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <CheckCheck size={16} className="text-emerald-600" />
              <span className="text-emerald-700 text-sm font-medium">Notification envoyée avec succès !</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Target */}
            <div>
              <label className="label">Destinataires</label>
              <div className="grid grid-cols-2 gap-2">
                {targetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTarget(opt.value)}
                    className={clsx(
                      'flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all',
                      target === opt.value
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <span>{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="notif-title">Titre</label>
              <input
                id="notif-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la notification..."
                maxLength={60}
              />
              <div className="text-right text-xs text-slate-400 mt-1">{title.length}/60</div>
            </div>

            <div>
              <label className="label" htmlFor="notif-body">Message</label>
              <textarea
                id="notif-body"
                className="input resize-none"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Corps du message..."
                rows={4}
                maxLength={200}
              />
              <div className="text-right text-xs text-slate-400 mt-1">{body.length}/200</div>
            </div>

            {/* Preview */}
            {(title || body) && (
              <div className="p-4 bg-slate-800 rounded-2xl">
                <div className="text-xs text-white/40 mb-2">📱 Prévisualisation</div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm flex-shrink-0">🚗</div>
                  <div>
                    <div className="font-semibold text-white text-sm">{title || 'Titre...'}</div>
                    <div className="text-white/60 text-xs mt-0.5 leading-relaxed">{body || 'Message...'}</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!title.trim() || !body.trim() || isSending}
              className="btn-primary w-full py-3"
            >
              {isSending ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Envoi en cours...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <Send size={15} /> Envoyer la notification
                </span>
              )}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="xl:col-span-3 card">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Historique des envois</h3>
            <span className="badge-neutral">{NOTIFICATION_HISTORY.length} envois</span>
          </div>
          <div className="divide-y divide-slate-50">
            {NOTIFICATION_HISTORY.map((n) => {
              const readRate = Math.round((n.read / n.sent) * 100);
              return (
                <div key={n.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800 text-sm">{n.title}</span>
                        <span className={clsx('badge text-xs', n.target === 'ALL' ? 'badge-neutral' : n.target === 'CLIENTS' ? 'badge-info' : 'badge-success')}>
                          {n.target === 'ALL' ? '👥 Tous' : n.target === 'CLIENTS' ? '👤 Clients' : '🚗 Chauffeurs'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{n.body}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Send size={11} className="text-slate-400" />
                          <span className="text-xs text-slate-500">{n.sent.toLocaleString()} envoyés</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCheck size={11} className="text-emerald-500" />
                          <span className="text-xs text-emerald-600">{n.read.toLocaleString()} lus ({readRate}%)</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{n.date}</span>
                  </div>
                  {/* Progress bar read rate */}
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${readRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
