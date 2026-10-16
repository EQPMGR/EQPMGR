'use client';

import { AdminAccessGate } from '@/components/admin-access-gate';

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return <AdminAccessGate>{children}</AdminAccessGate>;
}
