
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function StravaCallback() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(true);

  useEffect(() => {
    if (!user) {
      // Wait for user to be available
      return;
    }

    const stravaCode = searchParams.get('code');
    const stravaError = searchParams.get('error');

    if (stravaError) {
      setError(`Strava returned an error: ${stravaError}`);
      toast({
        variant: 'destructive',
        title: 'Strava Connection Error',
        description: 'Could not connect your account. Please try again.',
      });
      setIsExchanging(false);
      return;
    }

    if (stravaCode) {
      fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: stravaCode }),
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
        router.push('/settings/apps');
      })
      .catch((err) => {
        setError(err.message);
        toast({
          variant: 'destructive',
          title: 'Connection Failed',
          description: err.message,
        });
        setIsExchanging(false);
      });
    } else {
        setError("No authorization code provided by Strava.");
        setIsExchanging(false);
    }
  }, [user, searchParams, router, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-4">
        {isExchanging && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Connecting to Strava...</h1>
            <p className="text-muted-foreground text-center">Please wait while we securely connect your account. You will be redirected shortly.</p>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-4">
                 <button onClick={() => router.push('/settings/apps')} className="text-destructive-foreground underline">Return to Settings</button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export default function StravaCallbackPage() {
    // Suspense is required for pages that use useSearchParams()
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <StravaCallback />
        </Suspense>
    )
}
