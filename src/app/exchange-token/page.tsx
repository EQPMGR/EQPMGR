// app/exchange-token/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ExchangeTokenPage() {
  const [status, setStatus] = useState('Exchanging token, please wait...');
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Token exchange failed');
        }
        return res.json();
      })
      .then(data => {
        console.log('Success:', data);
        setStatus('Successfully connected to Strava! You can close this window.');
        // Optionally redirect back to the settings page
        // window.location.href = '/settings?strava=success';
      })
      .catch(err => {
        console.error(err);
        setStatus('Failed to connect to Strava. Please try again.');
        // window.location.href = '/settings?strava=error';
      });
    } else {
      setStatus('Invalid request. No authorization code found.');
    }
  }, [searchParams]);

  return (
    <div>
      <h1>Connecting to Strava...</h1>
      <p>{status}</p>
    </div>
  );
}