
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
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleStravaConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Strava integration is not configured correctly.',
      });
      return;
    }

    const redirectUri = 'http://localhost:3000/strava/callback';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'force',
      scope: 'read_all,profile:read_all,activity:read_all',
    });

    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    window.location.href = stravaAuthUrl;
  };

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
                  <Button variant="destructive" onClick={handleStravaDisconnect}>Disconnect</Button>
                ) : (
                  <Button onClick={handleStravaConnect}>Connect</Button>
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
      // Suspense is required for pages that might use useSearchParams() in children
      <Suspense fallback={<div>Loading settings...</div>}>
        <ConnectedAppsManager />
      </Suspense>
    );
}
