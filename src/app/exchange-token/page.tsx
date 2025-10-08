
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function ExchangeTokenPage() {
  const [status, setStatus] = useState('Connecting to Strava...');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const hasExecuted = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasExecuted.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Verify state parameter to prevent CSRF attacks
    const savedState = sessionStorage.getItem('strava_oauth_state');

    if (!code) {
      setStatus('Invalid request. Missing authorization code.');
      setTimeout(() => router.push('/settings/apps'), 3000);
      hasExecuted.current = true;
      return;
    }

    if (!state || state !== savedState) {
      setStatus('Security error. Invalid state parameter. Redirecting...');
      sessionStorage.removeItem('strava_oauth_state');
      setTimeout(() => router.push('/settings/apps'), 3000);
      hasExecuted.current = true;
      return;
    }

    // Clear the state from session storage
    sessionStorage.removeItem('strava_oauth_state');

    // If auth is still loading, show loading state but don't block
    if (loading) {
      setStatus('Verifying your identity...');
      return;
    }

    if (!user) {
      setStatus('Authentication error. Please log in and try again.');
      setTimeout(() => router.push('/settings/apps'), 3000);
      hasExecuted.current = true;
      return;
    }

    // Mark as executed to prevent double runs
    hasExecuted.current = true;

    setStatus('Exchanging authorization code...');

    // Get fresh ID token and exchange authorization code for access token
    user.getIdToken()
      .then(idToken => {
        return fetch('/api/strava/token-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, idToken }),
        });
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => Promise.reject(err.error || 'Token exchange failed'));
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
            setStatus('Successfully connected to Strava! Redirecting...');
            router.push('/settings/apps?strava_connected=true');
        } else {
            throw new Error(data.error || 'Unknown error during token exchange.');
        }
      })
      .catch(err => {
        setStatus(`Failed to connect to Strava: ${err}. Redirecting...`);
        setTimeout(() => router.push('/settings/apps'), 4000);
      });
  }, [searchParams, router, user, loading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
      <h1 className="text-2xl font-bold mb-2">Connecting to Strava</h1>
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}
