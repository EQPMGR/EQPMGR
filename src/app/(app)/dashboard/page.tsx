'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link'; // ADDED: Required for the "Connect" CTA
import { Loader2, RefreshCw, Zap } from 'lucide-react'; // ADDED: Zap icon for the CTA
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ActivityCard } from '@/components/activity-card';
import { fetchRecentStravaActivities, fetchUserBikes, checkStravaConnection, type StravaActivity } from '@/app/(app)/settings/apps/actions';
import type { Equipment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface RecentActivitiesProps {
    showTitle?: boolean;
}

export function RecentActivities({ showTitle = false }: RecentActivitiesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(true);
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
    // Check for user before attempting sync on mount
    if (user) {
        handleSyncActivities(true);
    } else {
        // If user is null (not logged in or still loading auth), ensure syncing is false so we render the CTA if needed
        // Although the user should be guaranteed on this page, this is a safety check.
        setIsSyncing(false);
    }
  }, [handleSyncActivities, user]); // Added user to dependencies

  const onActivityAssigned = (activityId: number) => {
      setRecentActivities(prev => prev.filter(a => a.id !== activityId));
  }

  // MODIFIED LOGIC: Show a CTA card instead of returning null if not connected
  if (!isStravaConnected && !isSyncing) {
      return (
        <Card className="h-fit min-h-48">
            <CardHeader>
                {showTitle && <CardTitle>Recent Strava Activities</CardTitle>}
                <CardDescription>Connect to Strava to view and assign your recent rides.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/settings/apps" passHref>
                    <Button className="w-full">
                        <Zap className="h-4 w-4 mr-2" />
                        Connect Strava Now
                    </Button>
                </Link>
            </CardContent>
        </Card>
      );
  }

  // If user is still loading from useAuth, we also don't render.
  if (!user && !isStravaConnected) {
    return (
        <Card className="h-fit min-h-48">
            <CardHeader>
                {showTitle && <CardTitle>Recent Strava Activities</CardTitle>}
                <CardDescription>Awaiting user authentication before syncing Strava data...</CardDescription>
            </CardHeader>
            <CardContent>
                 <Loader2 className="h-6 w-6 mr-2 animate-spin text-primary" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="min-h-48"> {/* ADDED min-h-48 here */}
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    {showTitle && <CardTitle>Recent Strava Activities</CardTitle>}
                    <CardDescription>Assign your recent rides to a bike to track wear.</CardDescription>
                </div>
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
                    <p>No recent unassigned activities found.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
