
'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StravaDashboardWrapper } from '@/components/strava-dashboard-wrapper';
import { useToast } from '@/hooks/use-toast';


function Dashboard() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    if (searchParams.get('strava_connected') === 'true') {
      toast({
        title: 'Strava Connected!',
        description: 'Your Strava account has been successfully linked.',
      });
      // Remove the query param from the URL
      router.replace('/dashboard');
    }
  }, [searchParams, router, toast]);

  return (
    <div className="space-y-6">
      <StravaDashboardWrapper />
       {/* Future cards can be added here, e.g.
        <Card>
          <CardHeader>
            <CardTitle>Open Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
             <p>Work order content...</p>
          </CardContent>
        </Card>
      */}
    </div>
  );
}

export default function DashboardPage() {
  // Using Suspense is good practice for components that fetch data.
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}
