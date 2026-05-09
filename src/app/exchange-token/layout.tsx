// This file has been removed as the logic is now handled
// by the API route at /src/app/api/strava/token-exchange/route.ts
import { Suspense } from 'react';

export default function DeprecatedExchangeTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
