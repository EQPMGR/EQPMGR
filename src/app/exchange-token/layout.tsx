// src/app/exchange-token/layout.tsx
import { Suspense } from 'react';

export default function ExchangeTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}