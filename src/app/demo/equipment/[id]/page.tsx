
'use client'
import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bike,
  ChevronLeft,
  Footprints,
  Puzzle,
  Shield,
  Pencil,
  Trash2,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ComponentStatusList } from '@/components/component-status-list';
import { MaintenanceLog } from '@/components/maintenance-log';
import { WearSimulation } from '@/components/wear-simulation';
import { MaintenanceSchedule } from '@/components/maintenance-schedule';
import { demoEquipment } from '@/lib/demo-data';
import { AccessoriesIcon } from '@/components/icons/accessories-icon';
import { WheelsetIcon } from '@/components/icons/wheelset-icon';
import { RimBrakeIcon } from '@/components/icons/rim-brake-icon';
import { SuspensionIcon } from '@/components/icons/suspension-icon';
import { FramesetIcon } from '@/components/icons/frameset-icon';
import { FitInfoIcon } from '@/components/icons/fit-info-icon';
import { DrivetrainIcon } from '@/components/icons/drivetrain-icon';
import { DiscBrakeIcon } from '@/components/icons/disc-brake-icon';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

function ComponentIcon({ componentName, className }: { componentName: string, className?: string }) {
    const name = componentName.toLowerCase();
    
    if (name.includes('accessories')) return <AccessoriesIcon className={className} />;
    if (name.includes('frame')) return <FramesetIcon className={className} />;
    if (name.includes('disc brake')) return <DiscBrakeIcon className={className} />;
    if (name.includes('rim brake')) return <RimBrakeIcon className={className} />;
    if (name.includes('brake')) return <DiscBrakeIcon className={className} />;
    if (name.includes('wheel')) return <WheelsetIcon className={className} />;
    if (name.includes('cockpit')) return <Puzzle className={className} />;
    if (name.includes('suspension')) return <SuspensionIcon className={className} />;
    if (name.includes('drivetrain')) return <DrivetrainIcon className={className} />;
    if (name.includes('e-bike')) return <Zap className={className} />;
    return <Puzzle className={className} />;
}

export default function DemoEquipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const equipment = demoEquipment.find(e => e.id === params.id);

  const systemsToDisplay = useMemo(() => {
    if (!equipment?.components) return [];
    
    const systems = new Set<string>();
    equipment.components.forEach(c => systems.add(c.system));
    
    const preferredOrder = [
        'Drivetrain', 'Suspension', 'E-Bike', 'Brakes', 
        'Wheelset', 'Frameset', 'Cockpit', 'Accessories'
    ];

    return preferredOrder.filter(system => systems.has(system));
  }, [equipment?.components]);

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Equipment not found</h1>
          <Button asChild variant="link">
            <Link href="/demo/equipment">Go back to Demo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const topComponents = [...equipment.components]
    .sort((a, b) => b.wearPercentage - a.wearPercentage)
    .slice(0, 3);

  const Icon = (equipment.type !== 'Running Shoes' && equipment.type !== 'Other') ? Bike : Footprints;

  return (
    <>
        <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="sm" asChild>
                <Link href="/demo/equipment">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Link>
            </Button>
        </div>
        <div className="grid items-start gap-4 md:gap-8 lg:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <Icon className="h-7 w-7" />
                            {equipment.name}
                        </CardTitle>
                        <CardDescription>
                          <span>{equipment.brand} {equipment.model}{equipment.frameSize && ` - ${equipment.frameSize}`}</span>
                          <span className="block">{equipment.type}</span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="icon" disabled>
                            <Pencil className="h-4 w-4" />
                         </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Disabled</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This is a read-only demo.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>OK</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <ComponentStatusList components={topComponents} />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {systemsToDisplay.map(systemName => (
                    <Link href={`/demo/equipment/${equipment.id}/${systemName.toLowerCase().replace(/\s+/g, '-')}`} key={systemName}>
                        <Card className="hover:bg-muted/50 cursor-pointer transition-colors h-full">
                          <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 gap-2">
                            <ComponentIcon componentName={systemName} className="h-[40px] w-[40px] text-muted-foreground" />
                            <h4 className="text-sm font-headline font-bold uppercase text-center tracking-wider">{systemName}</h4>
                          </CardContent>
                        </Card>
                    </Link>
                  ))}
              </CardContent>
            </Card>
            
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Card>
                    <CardContent className="grid grid-cols-2 text-center pt-6">
                        <div>
                            <p className="text-3xl md:text-4xl font-headline">
                                {equipment.totalDistance}
                                <span className="text-lg md:text-xl font-normal text-muted-foreground"> km</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Total Distance</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-headline">
                                {equipment.totalHours}
                                <span className="text-lg md:text-xl font-normal text-muted-foreground"> hrs</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Total Time</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="grid grid-cols-2 text-center pt-6">
                        <div>
                            <p className="text-xl md:text-2xl font-headline pt-2">
                                {equipment.purchaseDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}
                            </p>
                            <p className="text-xs text-muted-foreground">Purchased</p>
                        </div>
                        <div>
                            <p className="text-xl md:text-2xl font-headline pt-2">
                                ${equipment.purchasePrice?.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Price</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <MaintenanceLog log={equipment.maintenanceLog} onAddLog={async () => {}} />
            <WearSimulation equipment={equipment} />
            <MaintenanceSchedule equipment={equipment} />
          </div>
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <FitInfoIcon className="h-5 w-5" />
                      Fit Information
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <Button asChild variant="secondary" className="w-full" disabled>
                      <Link href="#">
                          View Fit Details
                      </Link>
                  </Button>
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield />
                        Protect Your Gear
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Button asChild disabled>
                        <Link href="#" target="_blank" rel="noopener noreferrer">
                            Register with Project 529
                        </Link>
                    </Button>
                    <Button asChild variant="secondary" disabled>
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

