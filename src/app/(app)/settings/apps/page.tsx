
'use client';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import React, { useEffect, useState, Suspense } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Bike, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { fetchRecentStravaActivities, type StravaActivity } from './actions';

interface StravaData {
  id: number;
  connectedAt: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function StravaActivitySyncer() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [activities, setActivities] = useState<StravaActivity[]>([]);

    const handleSync = async () => {
        if (!user) return;
        setIsSyncing(true);
        setActivities([]);
        try {
            const result = await fetchRecentStravaActivities();
            if (result.error) {
                toast({ variant: 'destructive', title: 'Sync Failed', description: result.error });
            } else if (result.activities) {
                setActivities(result.activities);
                toast({ title: 'Sync Successful!', description: `Found ${result.activities.length} recent activities.` });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Activity Sync</CardTitle>
                <CardDescription>
                    Manually sync your recent Strava activities. In the future, this will happen automatically.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleSync} disabled={isSyncing}>
                    {isSyncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Bike className="mr-2 h-4 w-4" />
                    )}
                    Fetch Recent Strava Activities
                </Button>
            </CardContent>
            {activities.length > 0 && (
                <CardFooter className="flex-col items-start gap-2">
                    <h4 className="font-semibold">Synced Activities:</h4>
                    <ul className="list-disc pl-5 w-full">
                        {activities.map(activity => (
                            <li key={activity.id} className="text-sm flex justify-between items-center">
                                <span>{activity.name} - {(activity.distance / 1000).toFixed(2)} km</span>
                                <Button variant="ghost" size="sm" asChild>
                                    <a href={`https://strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer">
                                        View <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </CardFooter>
            )}
        </Card>
    );
}


function ConnectedAppsManager() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stravaAuthUrl, setStravaAuthUrl] = useState<string>('');
  const [mapMyRideAuthUrl, setMapMyRideAuthUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStravaData(data.strava || null);
        }
        setIsLoading(false);
      });
      
      const stravaClientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
      if (stravaClientId) {
        const stravaRedirectUri = (window.location.hostname === 'localhost' ? 'http://localhost:6000' : window.location.origin) + '/strava/callback';
        const stravaParams = new URLSearchParams({
          client_id: stravaClientId,
          redirect_uri: stravaRedirectUri,
          response_type: 'code',
          approval_prompt: 'force',
          scope: 'read_all,profile:read_all,activity:read_all',
        });
        setStravaAuthUrl(`https://www.strava.com/oauth/authorize?${stravaParams.toString()}`);
      }
      
      const mmrClientId = process.env.NEXT_PUBLIC_MAPMYRIDE_CLIENT_ID;
      if (mmrClientId) {
          const mmrRedirectUri = (window.location.hostname === 'localhost' ? 'http://localhost:6000' : window.location.origin) + '/mapmyride/callback';
          const mmrParams = new URLSearchParams({
            client_id: mmrClientId,
            response_type: 'code',
            redirect_uri: mmrRedirectUri,
          });
          setMapMyRideAuthUrl(`https://www.mapmyfitness.com/oauth2/authorize/?${mmrParams.toString()}`);
      }

      return () => unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [user, toast]);

  const handleConnect = (url: string) => {
      if (url) {
          window.open(url, '_blank');
      }
  }

  const handleStravaDisconnect = async () => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            strava: null
        });
        toast({ title: 'Strava Disconnected' });
    }
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
              <CardTitle>Connected Apps</CardTitle>
              <CardDescription>
                Connect your fitness apps to automatically import workout data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h4 className="font-semibold">Strava</h4>
                        {isLoading ? (
                           <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Loading...</span>
                           </div>
                        ) : stravaData ? (
                           <p className="text-sm text-muted-foreground">
                             Connected on {new Date(stravaData.connectedAt).toLocaleDateString()}
                           </p>
                        ) : (
                           <p className="text-sm text-muted-foreground">Not connected</p>
                        )}
                    </div>
                    {stravaData ? (
                      <Button variant="destructive" onClick={handleStravaDisconnect}>Disconnect</Button>
                    ) : (
                      <Button onClick={() => handleConnect(stravaAuthUrl)} disabled={!stravaAuthUrl}>
                        Connect with Strava
                      </Button>
                    )}
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h4 className="font-semibold">MapMyRide</h4>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                    <Button onClick={() => handleConnect(mapMyRideAuthUrl)} disabled={!mapMyRideAuthUrl}>Connect with MapMyRide</Button>
                </div>
            </CardContent>
        </Card>

        {stravaData && <StravaActivitySyncer />}
    </div>
  )
}

export default function ConnectedAppsPage() {
    return (
      <Suspense fallback={<div>Loading settings...</div>}>
        <ConnectedAppsManager />
      </Suspense>
    );
}
