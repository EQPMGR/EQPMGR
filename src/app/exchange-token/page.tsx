'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ExchangeTokenPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing Strava connection...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('Missing Strava authorization code. Please try connecting again.');
      setStatus('Connection cannot continue.');
      return;
    }

    const storedIdTokenFromStorage = window.localStorage.getItem('strava_id_token');
    const storedIdTokenFromCookieMatch = document.cookie.match('(?:^|; )strava_id_token=([^;]*)');
    const storedIdToken = storedIdTokenFromStorage || (storedIdTokenFromCookieMatch ? decodeURIComponent(storedIdTokenFromCookieMatch[1]) : null);

    const isProbablyJwt = typeof storedIdToken === 'string' && storedIdToken.split('.').length === 3;
    if (!storedIdToken || !isProbablyJwt) {
      window.localStorage.removeItem('strava_id_token');
      document.cookie = 'strava_id_token=; path=/; max-age=0; SameSite=Lax';
      setError('Stored authentication token is invalid or expired. Please reconnect your Strava account.');
      setStatus('Connection cannot continue.');
      return;
    }

    setStatus('Finishing Strava authentication...');

    window
      .fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state, idToken: storedIdToken }),
      })
      .then(async (response) => {
        const text = await response.text();
        let data: any = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseError) {
          console.warn('Strava exchange returned non-JSON response', { status: response.status, body: text, parseError });
          data = { error: text || `Unexpected server response (${response.status})` };
        }

        const maybeError = data && typeof data === 'object' ? data.error : typeof data === 'string' ? data : null;
        const maybeRedirectUrl = data && typeof data === 'object' ? data.redirectUrl : null;

        if (!response.ok) {
          throw new Error(maybeError || `Failed to complete Strava connection. Status: ${response.status}`);
        }

        window.localStorage.removeItem('strava_id_token');
        document.cookie = 'strava_id_token=; path=/; max-age=0; SameSite=Lax';
        if (maybeRedirectUrl) {
          window.location.replace(maybeRedirectUrl);
        } else {
          throw new Error(maybeError || 'Missing redirect URL from server.');
        }
      })
      .catch((err: Error) => {
        console.error('Strava exchange failed:', err);
        setError(err.message || 'An unknown error occurred while connecting Strava.');
        setStatus('Connection failed.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="max-w-lg w-full rounded-xl border p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">Connecting Strava</h1>
        <p className="text-sm text-muted-foreground mb-6">{status}</p>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
            <strong>Unable to finish connection:</strong>
            <div>{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
