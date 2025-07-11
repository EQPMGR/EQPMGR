
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
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StravaData {
  id: number;
  connectedAt: string;
}

export default function ConnectedAppsPage() {
  const { user } = useAuth();
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
    }
  }, [user]);

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
