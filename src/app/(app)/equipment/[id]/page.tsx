
import Link from 'next/link';
import {
  Bike,
  ChevronLeft,
  Footprints,
  Shield,
} from 'lucide-react';
import { equipmentData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <>
        <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="sm" asChild>
                <Link href="/">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Link>
            </Button>
        </div>
        <div className="grid flex-1 items-start gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-headline">{equipment.name}</CardTitle>
                <CardDescription>{equipment.brand} {equipment.model}</CardDescription>
              </CardHeader>
              <CardContent>
                <ComponentStatusList components={equipment.components} />
              </CardContent>
            </Card>
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
          <div className="grid auto-rows-max items-start gap-4 md:gap-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield />
                        Protect Your Gear
                    </CardTitle>
                    <CardDescription>
                        Register your equipment against theft and get it insured.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Button asChild>
                        <Link href="https://project529.com/garage" target="_blank" rel="noopener noreferrer">
                            Register with Project 529
                        </Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="#" target="_blank" rel="noopener noreferrer">
                            Get Insurance Quote
                        </Link>
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>
    </>
  );
}
