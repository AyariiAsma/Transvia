import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Dashboard' };

// Server component — redirect to overview
import { redirect } from 'next/navigation';
export default function DashboardPage() {
  redirect('/overview');
}
