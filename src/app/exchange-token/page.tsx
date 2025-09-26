// src/app/exchange-token/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function ExchangeTokenPage() {
  const [status, setStatus] = useState('Initializing...');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Also get the loading state from your auth hook

  useEffect(() => {
    // Wait until the auth state is fully loaded
    if (authLoading) {
      setStatus('Waiting for user authentication...');
      return;
    }
    
    // Check if the user is logged in
    if (!user) {
      setStatus('Error: User is not authenticated. Redirecting...');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      setStatus('Error: Invalid request from Strava. No authorization code found.');
      return;
    }

    setStatus('Exchanging token, please wait...');

    // Now we are sure we have a user, get their ID token
    user.getIdToken(true) // Pass true to force a refresh, ensuring a valid token
      .then(idToken => {
        return fetch('/api/strava/token-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, idToken }),
        });
      })
      .then(res => {
        if (!res.ok) {
          // Try to get more details from the server's response
          return res.json().then(err => {
             throw new Error(err.error || 'Token exchange on our server failed.');
          });
        }
        return res.json();
      })
      .then(data => {
        console.log('Success:', data);
        setStatus('Successfully connected to Strava! Redirecting...');
        setTimeout(() => router.push('/settings/apps'), 2000);
      })
      .catch(err => {
        console.error(err);
        setStatus(`Failed to connect to Strava: ${err.message}. Redirecting...`);
        setTimeout(() => router.push('/settings/apps'), 4000);
      });

  }, [authLoading, user, searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Connecting to Strava...</h1>
      <p>{status}</p>
    </div>
  );
}