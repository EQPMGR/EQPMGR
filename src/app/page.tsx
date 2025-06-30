import Link from 'next/link';
import {
  Bike,
  Home,
  PanelLeft,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { DashboardPage } from '@/components/dashboard-page';
import { Logo } from '@/components/logo';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="#"
                  className="group flex shrink-0 items-center justify-center gap-2 text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Logo className="h-7 w-7 transition-all group-hover:scale-110" />
                  <span className="sr-only">TrailPulse</span>
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-foreground"
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
                  href="#"
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
        <main className="flex-1 p-4">
          <DashboardPage />
        </main>
      </div>
    </div>
  );
}
