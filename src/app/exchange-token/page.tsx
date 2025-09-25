// src/app/exchange-token/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; // Assuming you have a custom auth hook

export default function ExchangeTokenPage() {
  const [status, setStatus] = useState('Exchanging token, please wait...');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');

    if (user && code) {
      user.getIdToken().then(idToken => {
        fetch('/api/strava/token-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, idToken }),
        })
        .then(res => {
          if (!res.ok) {
            throw new Error('Token exchange on our server failed.');
          }
          return res.json();
        })
        .then(data => {
          console.log('Success:', data);
          setStatus('Successfully connected to Strava! Redirecting...');
          // Redirect back to the settings page after a short delay
          setTimeout(() => router.push('/settings/apps'), 2000);
        })
        .catch(err => {
          console.error(err);
          setStatus('Failed to connect to Strava. Please try again. Redirecting...');
          setTimeout(() => router.push('/settings/apps'), 3000);
        });
      });
    } else if (!user) {
      setStatus('Waiting for user authentication...');
    } else {
      setStatus('Invalid request. No authorization code found.');
    }
  }, [searchParams, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Connecting to Strava...</h1>
      <p>{status}</p>
    </div>
  );
}