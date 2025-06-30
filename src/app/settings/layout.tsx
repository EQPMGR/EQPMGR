import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bike,
  Home,
  Menu,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { SettingsNav } from '@/components/settings-nav';

export const metadata: Metadata = {
  title: 'Settings - TrailPulse',
  description: 'Manage your account settings.',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="text-destructive-foreground">
              <Menu className="h-10 w-10" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="#"
                className="group flex shrink-0 items-center justify-center gap-2 text-lg font-semibold text-primary-foreground md:text-base"
              >
                <Logo className="h-[60px] w-[60px] transition-all group-hover:scale-110" />
                <span className="sr-only">TrailPulse</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Home className="h-5 w-5" />
                Dashboard
              </Link>
              <Link
                href="#"
                className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Bike className="h-5 w-5" />
                Equipment
              </Link>
              <Link
                href="/settings/profile"
                className="mt-auto flex items-center gap-4 px-2.5 text-foreground"
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="ml-auto flex items-center gap-2">
          <UserNav />
        </div>
      </header>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold font-headline">Settings</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <SettingsNav />
          <div className="grid gap-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
