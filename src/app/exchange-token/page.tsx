
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ExchangeTokenPage() {
  const [status, setStatus] = useState('Exchanging token, please wait...');
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
        setError(`Strava returned an error: ${errorParam}. Redirecting...`);
        setTimeout(() => router.push('/settings/apps'), 3000);
        return;
    }

    const idToken = state ? new URLSearchParams(state).get('idToken') : null;

    if (code && idToken) {
      fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, idToken }),
      })
      .then(async res => {
          if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || 'Token exchange failed on server.');
          }
          return res.json();
      })
      .then(data => {
        setStatus('Successfully connected to Strava! Redirecting...');
        // Redirect back to settings page with a success indicator
        router.push('/settings/apps?strava_connected=true');
      })
      .catch(err => {
        console.error("Token exchange failed:", err);
        setError(`Failed to connect to Strava: ${err.message}. Redirecting...`);
        setTimeout(() => router.push('/settings/apps'), 4000);
      });
    } else {
      setError('Invalid request from Strava. Missing code or user identity. Redirecting...');
      setTimeout(() => router.push('/settings/apps'), 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {!error ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h1 className="text-xl font-semibold">Connecting to Strava...</h1>
            <p className="text-muted-foreground">{status}</p>
          </>
        ) : (
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
    </div>
  );
}
