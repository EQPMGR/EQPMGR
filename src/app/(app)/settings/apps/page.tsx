
'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StravaConnectButton } from '@/components/strava-connect-button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ActivityCard } from '@/components/activity-card';
import { fetchRecentStravaActivities, fetchUserBikes, type StravaActivity } from './actions';
import type { Equipment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


function AppsSettings() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recentActivities, setRecentActivities] = useState<StravaActivity[]>([]);
  const [userBikes, setUserBikes] = useState<Equipment[]>([]);
  const [isStravaConnected, setIsStravaConnected] = useState(false);

  useEffect(() => {
    // Check for connection status on component mount and when user object changes.
    // This is a simple check; a more robust solution might involve checking token validity.
    if (user) {
        // A simple check on a user sub-property is not robust.
        // Instead, we can check if a successful connection flag is set.
        const connected = localStorage.getItem('strava_connected') === 'true';
        setIsStravaConnected(connected);
    }
  }, [user]);


  const handleStravaConnect = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to connect to Strava.',
      });
      return;
    }
    setIsConnecting(true);

    try {
        const idToken = await user.getIdToken();
        const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
        const redirectUri = `${window.location.origin}/exchange-token`;
        
        // Pass the idToken in the state parameter
        const state = `idToken=${idToken}`;

        if (!clientId) {
          throw new Error('Strava Client ID is not configured.');
        }

        const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&approval_prompt=force&scope=read,activity:read_all&state=${state}`;

        window.location.href = stravaAuthUrl;

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Connection Error', description: error.message });
        setIsConnecting(false);
    }
  };
  
  const handleSyncActivities = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    setRecentActivities([]);
    try {
        const idToken = await user.getIdToken(true);
        const [{ activities, error: activityError }, { bikes, error: bikeError }] = await Promise.all([
            fetchRecentStravaActivities(idToken),
            fetchUserBikes(idToken)
        ]);
        
        if (activityError) throw new Error(activityError);
        if (bikeError) throw new Error(bikeError);
      
        setRecentActivities(activities || []);
        setUserBikes(bikes || []);
      
        if ((activities || []).length > 0) {
            toast({ title: "Sync Complete!", description: `Found ${activities?.length} recent activities.` });
        } else {
            toast({ title: "Nothing to sync", description: "No new activities found on Strava." });
        }

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    // This effect handles the initial sync after a successful connection.
    const justConnected = searchParams.get('strava_connected') === 'true';
    if (justConnected && user) {
        localStorage.setItem('strava_connected', 'true');
        setIsStravaConnected(true);
        toast({ title: 'Strava Connected!', description: 'Your account has been successfully linked.' });
        handleSyncActivities();
        // Clean the URL
        router.replace('/settings/apps', { scroll: false });
    } else if (isStravaConnected && !isConnecting) {
        // Automatically fetch activities if already connected
        handleSyncActivities();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStravaConnected, user]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>App Integrations</CardTitle>
          <CardDescription>
            Connect your accounts from other services to sync your activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">Strava</h4>
            
            {loading || isConnecting ? (
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isConnecting ? 'Connecting...' : 'Loading...'}
                </div>
            ) : isStravaConnected ? (
                <div className="text-sm font-medium text-green-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connected
                </div>
            ) : (
                <StravaConnectButton onClick={handleStravaConnect} />
            )}
            </div>
        </CardContent>
      </Card>
      
      {isStravaConnected && (
         <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Recent Strava Activities</CardTitle>
                        <CardDescription>Assign your recent rides to a bike to track wear.</CardDescription>
                    </div>
                    <button onClick={handleSyncActivities} disabled={isSyncing} className="flex items-center text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50">
                        {isSyncing ? (
                           <>
                             <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                             Syncing...
                           </>
                        ) : (
                           <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M20 4h-5v5M4 20h5v-5" />
                            </svg>
                            Sync Now
                           </>
                        )}
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {isSyncing ? (
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                       <Skeleton className="h-32" />
                       <Skeleton className="h-32" />
                       <Skeleton className="h-32" />
                   </div>
                ) : recentActivities.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {recentActivities.map(activity => (
                           <ActivityCard key={activity.id} activity={activity} bikes={userBikes} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No recent activities found. Click "Sync Now" to fetch them.</p>
                    </div>
                )}
            </CardContent>
         </Card>
      )}
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
