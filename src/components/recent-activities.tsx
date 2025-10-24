'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, RefreshCw, Zap } from 'lucide-react';
import Cookies from 'js-cookie';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ActivityCard } from '@/components/activity-card';
import { fetchRecentStravaActivities, fetchUserBikes, checkStravaConnection, type StravaActivity } from '@/app/(app)/settings/apps/actions';
import type { Equipment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StravaConnectButton } from './strava-connect-button';

interface RecentActivitiesProps {
    showTitle?: boolean;
}

export function RecentActivities({ showTitle = false }: RecentActivitiesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recentActivities, setRecentActivities] = useState<StravaActivity[]>([]);
  const [userBikes, setUserBikes] = useState<Equipment[]>([]);
  const [isStravaConnected, setIsStravaConnected] = useState(false);

  const handleSyncActivities = useCallback(async (isInitialSync = false) => {
    if (!user) return;
    setIsSyncing(true);
    if(!isInitialSync) {
        setRecentActivities([]);
    }
    try {
        const idToken = await user.getIdToken(true);
        const { connected } = await checkStravaConnection(idToken);
        setIsStravaConnected(connected);

        if (connected) {
            const [{ activities, error: activityError }, { bikes, error: bikeError }] = await Promise.all([
                fetchRecentStravaActivities(idToken),
                fetchUserBikes(idToken)
            ]);
            
            if (activityError) throw new Error(activityError);
            if (bikeError) throw new Error(bikeError);
        
            setRecentActivities(activities || []);
            setUserBikes(bikes || []);
        
            if (!isInitialSync) {
                if ((activities || []).length > 0) {
                    toast({ title: "Sync Complete!", description: `Found ${activities?.length} recent activities.` });
                } else {
                    toast({ title: "Nothing to sync", description: "No new activities found on Strava." });
                }
            }
        }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    handleSyncActivities(true);
  }, [handleSyncActivities]);

  const onActivityAssigned = (activityId: number) => {
      setRecentActivities(prev => prev.filter(a => a.id !== activityId));
  }
  
  const handleStravaConnect = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to connect to Strava.' });
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
        
        // Pass the current path in the state to redirect back correctly
        const state = `redirect_path=${pathname}`;

        const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&approval_prompt=force&scope=read,activity:read_all&state=${state}`;

        window.location.href = stravaAuthUrl;

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Connection Error', description: error.message });
        setIsConnecting(false);
    }
  };


  return (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    {showTitle && <CardTitle>Recent Strava Activities</CardTitle>}
                    <CardDescription>Assign your recent rides to a bike to track wear.</CardDescription>
                </div>
                {isStravaConnected && (
                    <Button onClick={() => handleSyncActivities(false)} disabled={isSyncing} variant="outline" size="sm">
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
                )}
            </div>
        </CardHeader>
        <CardContent>
            {isSyncing ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            ) : !isStravaConnected ? (
                 <div className="flex items-center justify-center flex-col gap-4 text-center py-8">
                    <p className="text-muted-foreground">Connect to Strava to view and assign your recent rides.</p>
                    <StravaConnectButton onClick={handleStravaConnect} />
                </div>
            ) : recentActivities.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recentActivities.map(activity => (
                        <ActivityCard key={activity.id} activity={activity} bikes={userBikes} onActivityAssigned={onActivityAssigned} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No recent unassigned activities found.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
