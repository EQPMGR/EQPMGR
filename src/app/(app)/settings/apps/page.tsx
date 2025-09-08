
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
import { doc, onSnapshot, updateDoc, setDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Bike, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { fetchRecentStravaActivities, fetchUserBikes, type StravaActivity } from './actions';
import { useSearchParams, useRouter } from "next/navigation";
import type { Equipment } from "@/lib/types";
import { ActivityCard } from "@/components/activity-card";

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
    const [bikes, setBikes] = useState<Equipment[]>([]);

    useEffect(() => {
        const getBikes = async () => {
            const { bikes, error } = await fetchUserBikes();
            if (error) {
                toast({ variant: 'destructive', title: 'Could not fetch bikes', description: error });
            } else {
                setBikes(bikes || []);
            }
        }
        getBikes();
    }, [toast]);

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
                    Manually sync your recent Strava activities to log wear and tear on your equipment.
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
                <CardFooter className="flex-col items-start gap-4">
                    <h4 className="font-semibold">Synced Activities:</h4>
                    <div className="grid w-full gap-4 md:grid-cols-2">
                        {activities.map(activity => (
                            <ActivityCard key={activity.id} activity={activity} bikes={bikes} />
                        ))}
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}

function ConnectedAppsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const stravaClientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const mapMyRideClientId = process.env.NEXT_PUBLIC_MAPMYRIDE_CLIENT_ID;

  const getStravaAuthUrl = () => {
    if (!stravaClientId) return '#';
    // Per Strava's docs for local dev, we redirect to localhost.
    // The page at /exchange-token will handle the code.
    const redirectUri = 'http://localhost:6000/exchange-token';
    const params = new URLSearchParams({
      client_id: stravaClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'force',
      scope: 'read,activity:read_all', // Request all necessary scopes
    });
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  const getMapMyRideAuthUrl = () => {
      if (!mapMyRideClientId) return '#';
      const redirectUri = `${window.location.origin}/mapmyride/callback`;
      const params = new URLSearchParams({
        client_id: mapMyRideClientId,
        response_type: 'code',
        redirect_uri: redirectUri,
      });
      return `https://www.mapmyfitness.com/oauth2/authorize/?${params.toString()}`;
  }

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
      
      return () => unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [user]);

  const handleStravaDisconnect = async () => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            strava: deleteField()
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
                       <Button asChild>
                            <a href={getStravaAuthUrl()}>Connect with Strava</a>
                       </Button>
                    )}
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h4 className="font-semibold">MapMyRide</h4>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                     <Button onClick={() => window.open(getMapMyRideAuthUrl(), '_blank')} disabled={!mapMyRideClientId}>
                        Connect with MapMyRide
                     </Button>
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
