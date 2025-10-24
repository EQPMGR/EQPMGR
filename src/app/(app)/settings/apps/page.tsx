'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RecentActivities } from '@/components/recent-activities';


function AppsSettings() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // This page is now simpler. It only checks for connection status from the URL
  // and displays the RecentActivities component, which contains all the logic.
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    if (loading) return;
    setCheckingConnection(false);

    const justConnected = searchParams.get('strava_connected') === 'true';
    const error = searchParams.get('strava_error');

    if (justConnected) {
      toast({ title: 'Strava Connected!', description: 'Your account has been successfully linked.' });
      router.replace('/settings/apps', { scroll: false });
    } else if (error) {
      toast({ variant: 'destructive', title: 'Connection Failed', description: decodeURIComponent(error) });
      router.replace('/settings/apps', { scroll: false });
    }
  }, [user, loading, searchParams, router, toast]);

  if (loading || checkingConnection) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>App Integrations</CardTitle>
                <CardDescription>
                    Connect your accounts from other services to sync your activities.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Checking connection...
                </div>
            </CardContent>
        </Card>
      );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>App Integrations</CardTitle>
          <CardDescription>
            Connect your accounts from other services to sync your activities.
          </CardDescription>
        </CardHeader>
        {/* The RecentActivities component now handles its own display logic */}
      </Card>
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
