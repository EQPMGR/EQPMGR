'use client';

import React, { Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StravaDashboardWrapper } from '@/components/strava-dashboard-wrapper';


function Dashboard() {
  const { user, loading } = useAuth();
  
  // You can add back the logic for Work Orders and other cards here later
  // For now, we are focusing on just the Strava component.

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
