
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function MapMyRideCallback() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const mmrCode = searchParams.get('code');
    const mmrError = searchParams.get('error');

    if (mmrError) {
      setError(`MapMyRide returned an error: ${mmrError}`);
      toast({
        variant: 'destructive',
        title: 'MapMyRide Connection Error',
        description: 'Could not connect your account. Please try again.',
      });
      setIsExchanging(false);
      return;
    }

    if (mmrCode) {
      fetch('/api/mapmyride/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mmrCode }),
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
          mapmyride: {
            id: data.user_id,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
            scope: data.scope,
            connectedAt: new Date().toISOString(),
          }
        }, { merge: true });

        // Refresh the session cookie to include new claims if necessary
        const idToken = await user.getIdToken(true);
        await fetch('/api/auth/session', { 
            method: 'POST',
            body: idToken 
        });

        toast({
          title: 'MapMyRide Connected!',
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
        setError("No authorization code provided by MapMyRide.");
        setIsExchanging(false);
    }
  }, [user, searchParams, router, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-4">
        {isExchanging && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Connecting to MapMyRide...</h1>
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

export default function MapMyRideCallbackPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <MapMyRideCallback />
        </Suspense>
    )
}
