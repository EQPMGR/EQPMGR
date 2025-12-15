
'use client';

/**
 * Minimal debug UI to call /api/debug and set a short-lived test cookie.
 *
 * After you deploy, visit: https://eqpmgr-athletes.netlify.app/debug
 *
 * Steps:
 *  1) Click "Set test cookie" — this sets debug_test cookie on the Netlify domain (60s).
 *  2) Click "Run diagnostics" — this calls /api/debug and reports cookie presence and env flags.
 *
 * The JSON results explain which server-side environment variables are present
 * and whether the server sees strava_id_token or debug_test cookies.
 */

import { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const callDebug = async (setCookie = false) => {
    setLoading(true);
    try {
      const url = setCookie ? '/api/debug?set=1' : '/api/debug';
      const res = await fetch(url, { credentials: 'include' });
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Strava OAuth Debug Diagnostics</h1>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        This page helps diagnose cookie and environment variable issues on Netlify.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => callDebug(true)}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Set test cookie'}
        </button>
        <button
          onClick={() => callDebug(false)}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Run diagnostics'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Results:</h2>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem',
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
