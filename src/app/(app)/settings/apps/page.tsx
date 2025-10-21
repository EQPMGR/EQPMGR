
'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { StravaConnectButton } from '@/components/strava-connect-button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ActivityCard } from '@/components/activity-card';
import { fetchRecentStravaActivities, fetchUserBikes, checkStravaConnection, type StravaActivity } from './actions';
import type { Equipment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Cookies from 'js-cookie';


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
  const [checkingConnection, setCheckingConnection] = useState(true);
  const initialSyncDone = useRef(false);

  // Check actual Strava connection from backend
  useEffect(() => {
    if (!user || loading) return;

    setCheckingConnection(true);
    user.getIdToken()
      .then(idToken => checkStravaConnection(idToken))
      .then(result => {
        setIsStravaConnected(result.connected);
      })
      .catch(() => {
        setIsStravaConnected(false);
      })
      .finally(() => {
        setCheckingConnection(false);
      });
  }, [user, loading]);


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
        const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
        const redirectUri = `${window.location.origin}/api/strava/token-exchange`;

        const idToken = await user.getIdToken();
        // Use a short-lived cookie to pass the ID token to the API route.
        Cookies.set('strava_id_token', idToken, { expires: 1/144, secure: true, sameSite: 'Lax' }); // Expires in 10 minutes

        if (!clientId) {
          throw new Error('Strava Client ID is not configured.');
        }
        
        const state = crypto.randomUUID();

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

    if (justConnected && user && !initialSyncDone.current) {
        initialSyncDone.current = true;
        setIsStravaConnected(true);
        toast({ title: 'Strava Connected!', description: 'Your account has been successfully linked.' });
        handleSyncActivities();
        // Clean the URL
        router.replace('/settings/apps', { scroll: false });
    }
  }, [searchParams, user, router, handleSyncActivities, toast]);

  const onActivityAssigned = (activityId: number) => {
      setRecentActivities(prev => prev.filter(a => a.id !== activityId));
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
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">Strava</h4>
            
            {loading || isConnecting || checkingConnection ? (
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isConnecting ? 'Connecting...' : checkingConnection ? 'Checking connection...' : 'Loading...'}
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
                    <Button onClick={handleSyncActivities} disabled={isSyncing} variant="outline" size="sm">
                        {isSyncing ? (
                           <>
                             <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                             Syncing...
                           </>
                        ) : (
                           <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Now
                           </>
                        )}
                    </Button>
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
                           <ActivityCard key={activity.id} activity={activity} bikes={userBikes} onActivityAssigned={onActivityAssigned} />
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
