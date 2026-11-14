'use client';

import { useEffect } from 'react';

/** Registers public/sw.js (installable app + offline page) on the live site only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err);
    });
  }, []);
  return null;
}
