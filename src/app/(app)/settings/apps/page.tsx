
'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { RecentActivities } from '@/components/recent-activities';


function AppsSettings() {
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
      router.replace('/settings/apps');
    }
  }, [searchParams, router, toast]);

  return (
    <div className="space-y-6">
      <RecentActivities />
    </div>
  );
}

export default function AppsSettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <AppsSettings />
    </Suspense>
  );
}
