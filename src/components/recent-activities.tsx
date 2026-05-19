
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';

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
    if (!isInitialSync) {
        setIsSyncing(true);
        setRecentActivities([]);
    }
    try {
        const idToken = await user.getIdToken(true);
        const result = await checkStravaConnection(idToken);
        const connected = result?.connected ?? false;
        if (!result) {
          throw new Error('Unable to verify Strava connection.');
        }
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
        const idToken = await user.getIdToken(true);
        window.localStorage.setItem('strava_id_token', idToken);

        const cookieValue = encodeURIComponent(idToken);
        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `strava_id_token=${cookieValue}; path=/; max-age=300; SameSite=Lax${secureFlag}`;

        const response = await fetch('/api/strava/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, redirectPath: pathname }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to start Strava connection.');
        }

        window.location.href = data.url;
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Connection Error', description: error.message });
    } finally {
        setIsConnecting(false);
    }
  };

  const [showDiag, setShowDiag] = useState(false);
  const [diagInfo, setDiagInfo] = useState<{ hasIdToken?: boolean; maskedIdToken?: string; localStoragePresent?: boolean; cookiePresent?: boolean; redirectUri?: string } | null>(null);

  const runDiagnostics = async () => {
      const info: any = {};
      try {
          if (user) {
              try {
                  const id = await user.getIdToken(true);
                  info.hasIdToken = !!id;
                  if (id && id.length > 8) {
                      info.maskedIdToken = `${id.slice(0,4)}...${id.slice(-4)}`;
                  }
              } catch (err) {
                  info.hasIdToken = false;
              }
          } else {
              info.hasIdToken = false;
          }
      } catch (e) {
          info.hasIdToken = false;
      }

      try {
          const storedToken = window.localStorage.getItem('strava_id_token');
          info.localStoragePresent = !!storedToken;
      } catch (e) {
          info.localStoragePresent = false;
      }

      try {
          info.cookiePresent = document.cookie.includes('strava_id_token=');
      } catch (e) {
          info.cookiePresent = false;
      }

      try {
          info.redirectUri = `${window.location.origin}/exchange-token`;
      } catch (e) {
          info.redirectUri = 'unknown';
      }

      setDiagInfo(info);
  };

  return (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>{showTitle ? "Recent Strava Activities" : "App Integrations"}</CardTitle>
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
                    <div className="mt-4 text-left w-full">
                        <button
                            className="text-sm underline text-muted-foreground"
                            onClick={() => { setShowDiag(v => !v); if (!showDiag) runDiagnostics(); }}
                        >
                            {showDiag ? 'Hide' : 'Show'} Strava Diagnostics
                        </button>

                        {showDiag && diagInfo && (
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <div><strong>ID token available:</strong> {diagInfo.hasIdToken ? 'Yes' : 'No'}</div>
                                <div><strong>Masked ID token:</strong> {diagInfo.maskedIdToken ?? '—'}</div>
                                <div><strong>Local token stored:</strong> {diagInfo.localStoragePresent ? 'Yes' : 'No'}</div>
                                <div><strong>Cookie present:</strong> {diagInfo.cookiePresent ? 'Yes' : 'No'}</div>
                                <div><strong>Computed redirect URI:</strong> <code className="break-all">{diagInfo.redirectUri}</code></div>
                            </div>
                        )}
                    </div>
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
