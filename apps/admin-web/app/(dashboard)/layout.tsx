import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export const metadata: Metadata = {
  title: {
    template: '%s | LogisticApp Admin',
    default: 'Dashboard | LogisticApp Admin',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar fixe */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
