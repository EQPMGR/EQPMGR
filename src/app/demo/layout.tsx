
'use client'

import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4">
            <Link href="/demo" className="flex items-center gap-2 font-semibold">
                <Logo className="h-8 w-8" />
                <span>EQPMGR Demo</span>
            </Link>
            <div className="ml-auto">
                <span className="text-sm text-muted-foreground">Gala Event Showcase</span>
            </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 md:px-8">
            {children}
        </main>
    </div>
  );
}
