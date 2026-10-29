import type { Metadata } from 'next';
import { OverviewClient } from './OverviewClient';

export const metadata: Metadata = { title: 'Dashboard' };

export default function OverviewPage() {
  return <OverviewClient />;
}
