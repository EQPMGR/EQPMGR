'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [userId, setUserId] = useState('e1419148-63b0-44a1-9997-3c1fa8db6ca8');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleServiceRoleWrite = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/debug/service-role-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, value: 'FUCK' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Service role write failed');
      }

      setStatus(`Success: wrote to ${userId}. Response: ${JSON.stringify(data)}`);
    } catch (error: any) {
      setStatus(`Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/95 p-8 shadow-lg shadow-slate-950/30">
        <h1 className="text-3xl font-semibold mb-4">Service Role Debug</h1>
        <p className="mb-6 text-slate-400">
          This page tests a server-side Supabase service-role write into the
          <code className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-200">app_users.strava</code>
          column.
        </p>
        <label className="block mb-4">
          <span className="text-sm text-slate-400">User ID</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </label>
        <button
          type="button"
          onClick={handleServiceRoleWrite}
          disabled={loading || userId.trim().length === 0}
          className="inline-flex items-center justify-center rounded-xl bg-fuchsia-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Writing...' : 'Write service-role test'}
        </button>

        {status && (
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-100">
            <strong>Status:</strong>
            <div className="mt-2 whitespace-pre-wrap">{status}</div>
          </div>
        )}
      </div>
    </main>
  );
}
