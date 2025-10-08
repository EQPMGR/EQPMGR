
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ExchangeTokenPage() {
  const [status, setStatus] = useState('Exchanging token, please wait...');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const idToken = state ? new URLSearchParams(state).get('idToken') : null;

    if (code && idToken) {
      fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, idToken }),
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
            // Redirect to settings page with a success flag
            router.push('/settings/apps?strava_connected=true');
        } else {
            throw new Error(data.error || 'Unknown error during token exchange.');
        }
      })
      .catch(err => {
        setStatus(`Failed to connect to Strava: ${err}. Redirecting...`);
        setTimeout(() => router.push('/settings/apps'), 4000);
      });
    } else {
      setStatus('Invalid request. Missing code or user token.');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Connecting to Strava...</h1>
      <p>{status}</p>
    </div>
  );
}
