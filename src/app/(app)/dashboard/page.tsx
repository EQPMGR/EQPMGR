
'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { StravaDashboardWrapper } from '@/components/strava-dashboard-wrapper';

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('strava_connected') === 'true') {
      toast({
        title: 'Strava Connected!',
        description: 'Your account has been successfully linked.',
      });
      // Clean the URL
      router.replace('/dashboard');
    }
  }, [searchParams, router, toast]);

  return (
    <div className="space-y-6">
      <StravaDashboardWrapper />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}
