
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { exchangeStravaToken } from './actions';
import { Loader2 } from 'lucide-react';

function ExchangeToken() {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      setStatus('Verifying user session...');
      return;
    }

    if (!user) {
      setStatus('User not authenticated. Redirecting to login...');
      router.push('/login');
      return;
    }

    const code = searchParams.get('code');
    const stravaError = searchParams.get('error');

    if (stravaError) {
      setError(`Strava returned an error: ${stravaError}.`);
      setStatus('Connection failed.');
      return;
    }

    if (!code) {
      setError('No authorization code provided by Strava.');
      setStatus('Connection failed.');
      return;
    }

    setStatus('Exchanging token with Strava...');
    exchangeStravaToken(code)
      .then(result => {
        if (result.success) {
          setStatus('Successfully connected! Redirecting...');
          setTimeout(() => router.push('/settings/apps'), 2000);
        } else {
          throw new Error(result.error);
        }
      })
      .catch(err => {
        console.error('Token exchange failed:', err);
        setError(err.message || 'An unknown error occurred during token exchange.');
        setStatus('Connection failed.');
      });
      
  }, [user, authLoading, searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold mb-4">Connecting to Strava...</h1>
      <div className="flex items-center gap-2 text-muted-foreground">
        {error ? (
           <span className="text-destructive">{status}</span>
        ) : (
          <>
            <Loader2 className="animate-spin" />
            <p>{status}</p>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive-foreground bg-destructive p-3 rounded-md">{error}</p>}
    </div>
  );
}

export default function ExchangeTokenPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <ExchangeToken />
        </Suspense>
    )
}
