'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { isAllowedAdminEmail } from '@/lib/admin-access';

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAllowed = isAllowedAdminEmail(user?.email ?? null);

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace('/dashboard');
    }
  }, [loading, isAllowed, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-10 w-72" />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
