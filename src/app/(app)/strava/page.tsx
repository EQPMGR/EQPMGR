
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function StravaAuthComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const stravaError = searchParams.get('error');

    if (stravaError) {
      setError(`Strava returned an error: ${stravaError}`);
      return;
    }

    if (code && user) {
      setIsLoading(true);
      
      // We have a code, now exchange it for a token.
      // This happens on the client side, but calls a serverless function (API route).
      fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Token exchange failed') });
        }
        return res.json();
      })
      .then(async data => {
        setTokenData(data);

        // Save the tokens to the user's document in Firestore
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

        // Redirect to the apps page after success
        router.push('/settings/apps');
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [searchParams, user, router, toast]);

  const getStravaConnectUrl = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    // Using localhost is more reliable for local dev than 127.0.0.1
    const redirectUri = 'http://localhost:3000/strava';

    if (!clientId) {
      // This should not happen if .env.local is set up
      return '#';
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'force', // 'force' is more reliable for avoiding loops
      scope: 'read_all,profile:read_all,activity:read_all',
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Connect to Strava</CardTitle>
        <CardDescription>
          Follow the steps to authorize EQPMGR to access your Strava data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!searchParams.get('code') && !error && (
            <div>
                <p className="mb-4">Click the button below to be redirected to Strava to approve the connection.</p>
                <Button asChild>
                    <Link href={getStravaConnectUrl()}>Step 1: Authorize with Strava</Link>
                </Button>
            </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Exchanging code for token, please wait...</p>
          </div>
        )}

        {error && (
          <div className="text-destructive">
            <h3 className="font-bold">An Error Occurred</h3>
            <p>{error}</p>
          </div>
        )}

        {tokenData && (
          <div>
            <h3 className="font-bold text-green-500">Success!</h3>
            <p>Your Strava account is connected. You will be redirected shortly.</p>
            <pre className="mt-2 text-xs bg-muted p-2 rounded-md overflow-x-auto">
              {JSON.stringify(tokenData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function StravaPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StravaAuthComponent />
        </Suspense>
    )
}
