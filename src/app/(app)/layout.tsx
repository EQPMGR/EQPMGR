
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike,
  Home,
  Menu,
  Settings,
  Activity,
  Database,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4">
          <Button size="icon" variant="ghost" className="text-destructive-foreground [&_svg]:size-10" disabled>
            <Menu />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between space-y-2 mb-6">
                <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex flex-col gap-2 md:flex-row">
                   <Skeleton className="h-10 w-36" />
                   <Skeleton className="h-10 w-40" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Skeleton className="h-[430px] w-full rounded-lg" />
                <Skeleton className="h-[430px] w-full rounded-lg" />
                <Skeleton className="h-[430px] w-full rounded-lg hidden lg:block" />
                <Skeleton className="h-[430px] w-full rounded-lg hidden xl:block" />
              </div>
        </main>
      </div>
    );
  }

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive-foreground [&_svg]:size-10">
                <Menu />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs p-0">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium p-6">
                <Link
                  href="/"
                  onClick={handleLinkClick}
                  className="group flex shrink-0 items-center justify-center gap-2 text-lg font-semibold text-primary-foreground md:text-base -mt-4"
                >
                  <Logo className="h-[60px] w-[60px] transition-all group-hover:scale-110" />
                  <span className="sr-only">EQPMGR</span>
                </Link>
                <Link
                  href="/"
                  onClick={handleLinkClick}
                  className="flex items-center gap-4 px-2.5 text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/equipment"
                  onClick={handleLinkClick}
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Bike className="h-5 w-5" />
                  Equipment
                </Link>
                <Link
                  href="/admin"
                  onClick={handleLinkClick}
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Database className="h-5 w-5" />
                  Admin
                </Link>
                <Link
                  href="/settings/profile"
                  onClick={handleLinkClick}
                  className="mt-auto flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
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
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
        </main>
    </div>
  );
}
