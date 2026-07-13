'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type StravaExchangeDiagnostics = {
  codePresent: boolean;
  statePresent: boolean;
  stateParsed: boolean;
  stateTokenKey?: string | null;
  tokenFoundIn?: string | null;
  storage: {
    local: boolean;
    session: boolean;
    stateKeyLocal: boolean;
    stateKeySession: boolean;
    cookie: boolean;
  };
};

export default function ExchangeTokenPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing Strava connection...');
  const [error, setError] = useState<string | null>(null);
  const [diagInfo, setDiagInfo] = useState<StravaExchangeDiagnostics | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('Missing Strava authorization code. Please try connecting again.');
      setStatus('Connection cannot continue.');
      return;
    }

    const storedIdTokenFromStorage = window.localStorage.getItem('strava_id_token');
    const storedIdTokenFromSession = window.sessionStorage.getItem('strava_id_token');
    const storedIdTokenFromCookieMatch = document.cookie.match('(?:^|; )strava_id_token=([^;]*)');
    const stateParam = searchParams.get('state');

    const decodeBase64Url = (value: string) => {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + ((4 - value.length % 4) % 4), '=');
      return new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
    };

    const parseStatePayload = (state: string | null) => {
      if (!state) return null;
      const [payload] = state.split('.');
      if (!payload) return null;
      try {
        return JSON.parse(decodeBase64Url(payload));
      } catch {
        return null;
      }
    };

    const statePayload = parseStatePayload(stateParam);
    const stateTokenKey = statePayload?.tokenKey;
    const storedIdTokenFromStateKeyLocal = stateTokenKey
      ? window.localStorage.getItem(stateTokenKey)
      : null;
    const storedIdTokenFromStateKeySession = stateTokenKey
      ? window.sessionStorage.getItem(stateTokenKey)
      : null;
    const storedIdTokenFromStateKey = storedIdTokenFromStateKeyLocal || storedIdTokenFromStateKeySession;

    const storedIdToken = storedIdTokenFromStorage || storedIdTokenFromSession || storedIdTokenFromStateKey || (storedIdTokenFromCookieMatch ? decodeURIComponent(storedIdTokenFromCookieMatch[1]) : null);

    setDiagInfo({
      codePresent: !!code,
      statePresent: !!state,
      stateParsed: !!statePayload,
      stateTokenKey: stateTokenKey ?? null,
      tokenFoundIn: storedIdTokenFromStorage
        ? 'localStorage'
        : storedIdTokenFromSession
          ? 'sessionStorage'
          : storedIdTokenFromStateKeyLocal
            ? 'stateKeyLocalStorage'
            : storedIdTokenFromStateKeySession
              ? 'stateKeySessionStorage'
              : storedIdTokenFromCookieMatch
                ? 'cookie'
                : null,
      storage: {
        local: !!storedIdTokenFromStorage,
        session: !!storedIdTokenFromSession,
        stateKeyLocal: !!storedIdTokenFromStateKeyLocal,
        stateKeySession: !!storedIdTokenFromStateKeySession,
        cookie: !!storedIdTokenFromCookieMatch,
      },
    });

    const isProbablyJwt = typeof storedIdToken === 'string' && storedIdToken.split('.').length === 3;
    if (!storedIdToken || !isProbablyJwt) {
      window.localStorage.removeItem('strava_id_token');
      window.sessionStorage.removeItem('strava_id_token');
      if (stateTokenKey) {
        window.localStorage.removeItem(stateTokenKey);
        window.sessionStorage.removeItem(stateTokenKey);
      }
      document.cookie = 'strava_id_token=; path=/; max-age=0; SameSite=None; Secure';
      setError('Stored authentication token is invalid or expired. Please reconnect your Strava account.');
      setStatus('Connection cannot continue.');
      return;
    }

    setStatus('Finishing Strava authentication...');

    window
      .fetch('/api/strava/token-exchange', {
        method: 'POST',
        credentials: 'include',
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
        window.sessionStorage.removeItem('strava_id_token');
        if (stateTokenKey) {
          window.localStorage.removeItem(stateTokenKey);
          window.sessionStorage.removeItem(stateTokenKey);
        }
        document.cookie = 'strava_id_token=; path=/; max-age=0; SameSite=None; Secure';
        if (maybeRedirectUrl) {
          window.location.replace(maybeRedirectUrl);
        } else {
          throw new Error(maybeError || 'Missing redirect URL from server.');
        }
      })
      .catch((err: Error) => {
        console.error('Strava exchange failed:', err, { diagInfo });
        setError(err.message || 'An unknown error occurred while connecting Strava.');
        setStatus('Connection failed.');
      });
  }, [searchParams, diagInfo]);

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
        {diagInfo && (
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-700">
            <div className="font-semibold mb-2">Strava Exchange Diagnostics</div>
            <div><strong>Code present:</strong> {diagInfo.codePresent ? 'Yes' : 'No'}</div>
            <div><strong>State present:</strong> {diagInfo.statePresent ? 'Yes' : 'No'}</div>
            <div><strong>State parsed:</strong> {diagInfo.stateParsed ? 'Yes' : 'No'}</div>
            <div><strong>Token key from state:</strong> {diagInfo.stateTokenKey ?? '—'}</div>
            <div><strong>Token found in:</strong> {diagInfo.tokenFoundIn ?? 'None'}</div>
            <div><strong>Storage sources:</strong></div>
            <ul className="list-disc ml-5">
              <li>localStorage: {diagInfo.storage.local ? 'Yes' : 'No'}</li>
              <li>sessionStorage: {diagInfo.storage.session ? 'Yes' : 'No'}</li>
              <li>stateKey localStorage: {diagInfo.storage.stateKeyLocal ? 'Yes' : 'No'}</li>
              <li>stateKey sessionStorage: {diagInfo.storage.stateKeySession ? 'Yes' : 'No'}</li>
              <li>cookie: {diagInfo.storage.cookie ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
