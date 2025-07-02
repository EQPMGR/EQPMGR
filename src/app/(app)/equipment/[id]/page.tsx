
'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bike,
  ChevronLeft,
  Footprints,
  Hexagon,
  Puzzle,
  Shield,
  Wrench,
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
// import { MaintenanceLog } from '@/components/maintenance-log';
import { WearSimulation } from '@/components/wear-simulation';
import { MaintenanceSchedule } from '@/components/maintenance-schedule';
import type { Equipment, MaintenanceLog as MaintenanceLogType, Component } from '@/lib/types';
import { AccessoriesIcon } from '@/components/icons/accessories-icon';
import { WheelsetIcon } from '@/components/icons/wheelset-icon';
import { RimBrakeIcon } from '@/components/icons/rim-brake-icon';
import { SuspensionIcon } from '@/components/icons/suspension-icon';
import { FramesetIcon } from '@/components/icons/frameset-icon';
import { FitInfoIcon } from '@/components/icons/fit-info-icon';
import { DrivetrainIcon } from '@/components/icons/drivetrain-icon';
import { DiscBrakeIcon } from '@/components/icons/disc-brake-icon';

function ComponentIcon({ componentName, className }: { componentName: string, className?: string }) {
    const name = componentName.toLowerCase();
    
    if (name.includes('accessories')) {
        return <AccessoriesIcon className={className} />;
    }

    if (name.includes('frame')) {
        return <FramesetIcon className={className} />;
    }

    if (name.includes('disc brake')) {
        return <DiscBrakeIcon className={className} />;
    }

    if (name.includes('rim brake')) {
        return <RimBrakeIcon className={className} />;
    }

    if (name.includes('brake')) {
        return <DiscBrakeIcon className={className} />;
    }
    
    if (name.includes('tire') || name.includes('wheel')) {
        return <WheelsetIcon className={className} />;
    }

    if (name.includes('suspension')) {
      return <SuspensionIcon className={className} />;
    }

    if (name.includes('drivetrain')) {
      return <DrivetrainIcon className={className} />;
    }

    // Default icon
    return <Puzzle className={className} />;
}


export default function EquipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<Equipment | undefined>();

  useEffect(() => {
    const foundEquipment = equipmentData.find((e) => e.id === params.id);
    setEquipment(foundEquipment);
  }, [params.id]);


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
  
  /*
  const handleAddLog = (newLog: Omit<MaintenanceLogType, 'id'>) => {
    setEquipment(prev => {
        if (!prev) return undefined;
        const newLogEntry: MaintenanceLogType = {
            ...newLog,
            id: `ml-${Date.now()}`,
        };
        const updatedEquipment = {
            ...prev,
            maintenanceLog: [newLogEntry, ...prev.maintenanceLog],
        };
        return updatedEquipment;
    });
  }
  */

  const systems = [
    { name: 'Drivetrain', keywords: ['drivetrain'] },
    { name: 'Brakes', keywords: ['brake'] },
    { name: 'Wheelset', keywords: ['tire', 'wheel'] },
    { name: 'Suspension', keywords: ['suspension', 'shock', 'dropper'] },
    { name: 'Frameset', keywords: ['frame'] },
    { name: 'Accessories', keywords: ['accessories'] }
  ];

  const topComponents = [...equipment.components]
    .sort((a, b) => b.wearPercentage - a.wearPercentage)
    .slice(0, 3);

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
        <div className="grid items-start gap-4 md:gap-8 lg:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <Icon className="h-7 w-7" />
                    {equipment.name}
                </CardTitle>
                <CardDescription>{equipment.brand} {equipment.model} &bull; {equipment.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <ComponentStatusList components={topComponents} />
              </CardContent>
            </Card>
             <Card>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6">
                    {systems.map(system => {
                      const highWearComponents = equipment.components.filter(c => 
                          system.keywords.some(kw => c.name.toLowerCase().includes(kw)) && c.wearPercentage > 70
                      );
                      const notificationCount = highWearComponents.length;

                      return (
                          <div key={system.name} role="button" tabIndex={0} className="relative p-4 border rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-accent group">
                              {notificationCount > 0 && (
                                  <div className="absolute top-1 right-1 flex items-center justify-center">
                                      <Hexagon className="h-6 w-6 text-primary fill-primary" />
                                      <span className="absolute text-primary-foreground text-xs font-bold">
                                          {notificationCount}
                                      </span>
                                  </div>
                              )}
                              <div className="h-[35px] w-[35px] flex items-center justify-center">
                                  <ComponentIcon componentName={system.name} className="h-full w-full text-muted-foreground group-hover:text-accent-foreground" />
                              </div>
                              <span className="text-xs text-center font-headline uppercase font-black text-muted-foreground group-hover:text-accent-foreground">{system.name}</span>
                          </div>
                      );
                    })}
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
                                {new Date(equipment.purchaseDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
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
            
            {/* <MaintenanceLog log={equipment.maintenanceLog} onAddLog={handleAddLog} /> */}
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
                  <CardDescription>
                      Dial in your bike fit for optimal comfort and performance.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button asChild variant="secondary" className="w-full">
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
                    <CardDescription>
                        Register your equipment against theft and get it insured.
                    </CardDescription>
                </Header>
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
