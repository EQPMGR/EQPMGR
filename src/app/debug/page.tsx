// Debug UI to help diagnose Strava OAuth cookie and environment variable issues in production (Netlify).
// Usage: Visit /debug to access this page, then click buttons to run diagnostics.
// Purpose: Provides a simple interface to test cookie visibility and environment variable presence on server-side.

'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callDebugEndpoint = async (withSet: boolean) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url = withSet ? '/api/debug?set=1' : '/api/debug';
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        setError(`Error ${response.status}: ${data.message || 'Unknown error'}`);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '50px auto', 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif' 
    }}>
      <h1 style={{ marginBottom: '20px' }}>Debug: Strava OAuth Diagnostics</h1>
      
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This page helps diagnose cookie and environment variable issues with Strava OAuth on Netlify.
      </p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => callDebugEndpoint(true)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Set Test Cookie & Run Diagnostics
        </button>
        
        <button
          onClick={() => callDebugEndpoint(false)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Run Diagnostics
        </button>
      </div>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div>
          <h2 style={{ marginBottom: '10px' }}>Results:</h2>
          <pre style={{
            padding: '15px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '14px',
            lineHeight: '1.5',
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
