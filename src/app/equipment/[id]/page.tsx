import Link from 'next/link';
import {
  Bike,
  ChevronLeft,
  Footprints,
  Home,
  PanelLeft,
  Settings,
} from 'lucide-react';
import Image from 'next/image';
import { equipmentData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { ComponentStatusList } from '@/components/component-status-list';
import { MaintenanceLog } from '@/components/maintenance-log';
import { WearSimulation } from '@/components/wear-simulation';
import { MaintenanceSchedule } from '@/components/maintenance-schedule';

export default function EquipmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const equipment = equipmentData.find((e) => e.id === params.id);

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Equipment not found</h1>
          <Button asChild variant="link">
            <Link href="/">Go back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const Icon = equipment.type.includes('Bike') ? Bike : Footprints;

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
                  href="/"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-foreground"
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href="/">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Link>
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <UserNav />
          </div>
        </header>

        <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Distance</CardDescription>
                  <CardTitle className="text-4xl font-headline">
                    {equipment.totalDistance}
                    <span className="text-xl font-normal text-muted-foreground"> km</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Time</CardDescription>
                  <CardTitle className="text-4xl font-headline">
                    {equipment.totalHours}
                    <span className="text-xl font-normal text-muted-foreground"> hrs</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Purchased</CardDescription>
                  <CardTitle className="text-3xl font-headline">
                    {new Date(equipment.purchaseDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                  </CardTitle>
                </CardHeader>
              </Card>
               <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Type</CardDescription>
                  <CardTitle className="text-3xl font-headline flex items-center gap-2">
                    <Icon className="h-6 w-6" /> {equipment.type}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
            <MaintenanceLog log={equipment.maintenanceLog} />
            <WearSimulation equipment={equipment} />
            <MaintenanceSchedule equipment={equipment} />

          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-headline">{equipment.name}</CardTitle>
                <CardDescription>{equipment.brand} {equipment.model}</CardDescription>
              </CardHeader>
              <CardContent>
                <ComponentStatusList components={equipment.components} />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
