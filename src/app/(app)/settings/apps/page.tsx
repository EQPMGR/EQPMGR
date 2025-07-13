
'use client';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import React, { useEffect, useState, Suspense } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StravaData {
  id: number;
  connectedAt: string;
}

function ConnectedAppsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const code = searchParams.get('code');
      const stravaError = searchParams.get('error');

      if (stravaError) {
        setError(`Strava returned an error: ${stravaError}`);
        // Clear the URL query parameters
        router.replace('/settings/apps');
        return;
      }
      
      if (code) {
        setIsExchangingToken(true);
        fetch('/api/strava/token-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error || 'Token exchange failed') });
            }
            return res.json();
        })
        .then(async (data) => {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                strava: {
                    id: data.athlete.id,
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: data.expires_at,
                    scope: searchParams.get('scope'),
                    connectedAt: new Date().toISOString(),
                }
            }, { merge: true });

            toast({
                title: 'Strava Connected!',
                description: 'Your account has been successfully linked.',
            });
        })
        .catch((err) => {
            setError(err.message);
            toast({
              variant: 'destructive',
              title: 'Connection Failed',
              description: err.message,
            })
        })
        .finally(() => {
            setIsExchangingToken(false);
            // Clear the URL query parameters after processing
            router.replace('/settings/apps');
        });
      }

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
  }, [user, searchParams, router, toast]);

  return (
    <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Connect your fitness apps to automatically import workout data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {isExchangingToken && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Connecting to Strava...</AlertTitle>
                <AlertDescription>
                  Please wait while we securely connect your account.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <h4 className="font-semibold">Strava</h4>
                    {isLoading ? (
                       <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : stravaData ? (
                       <p className="text-sm text-muted-foreground">
                         Connected on {new Date(stravaData.connectedAt).toLocaleDateString()}
                       </p>
                    ) : (
                       <p className="text-sm text-muted-foreground">Not connected</p>
                    )}
                </div>
                {stravaData ? (
                  <Button variant="secondary" disabled>Connected</Button>
                ) : (
                  <Button asChild>
                    <Link href="/api/strava/connect">Connect</Link>
                  </Button>
                )}
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                <div>
                    <h4 className="font-semibold">MapMyRide</h4>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
                <Button disabled>Connect</Button>
            </div>
        </CardContent>
    </Card>
  )
}

export default function ConnectedAppsPage() {
    return (
      // Suspense is required for pages that use useSearchParams()
      <Suspense fallback={<div>Loading settings...</div>}>
        <ConnectedAppsManager />
      </Suspense>
    );
}
