'use client'
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bike,
  ChevronLeft,
  Footprints,
  Puzzle,
  Shield,
  Pencil,
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { EditEquipmentDialog, type UpdateEquipmentData } from '@/components/edit-equipment-dialog';

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
    
    if (name.includes('wheel')) {
        return <WheelsetIcon className={className} />;
    }
    
    if (name.includes('cockpit')) {
        return <Puzzle className={className} />;
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
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      const fetchEquipment = async () => {
        setIsLoading(true);
        try {
          const equipmentRef = doc(db, 'users', user.uid, 'equipment', params.id);
          const equipmentSnap = await getDoc(equipmentRef);

          if (equipmentSnap.exists()) {
            setEquipment(equipmentSnap.data() as Equipment);
          } else {
            console.error("No such document!");
            setEquipment(undefined);
          }
        } catch (error) {
          console.error("Error fetching equipment details: ", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load equipment details."
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchEquipment();
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, params.id, authLoading, toast]);
  
  const handleUpdateEquipment = async (data: UpdateEquipmentData) => {
    if (!user || !equipment) {
      toast({ variant: "destructive", title: "Error", description: "Could not update equipment." });
      return;
    }
    const equipmentRef = doc(db, 'users', user.uid, 'equipment', equipment.id);
    await updateDoc(equipmentRef, data);
    setEquipment(prev => prev ? { ...prev, ...data } : undefined);
  };


  const componentsBySystem = useMemo(() => {
    if (!equipment) return {};
    return equipment.components.reduce((acc, component) => {
        const { system } = component;
        if (!acc[system]) {
            acc[system] = [];
        }
        acc[system].push(component);
        return acc;
    }, {} as Record<string, Component[]>);
  }, [equipment]);

  const systemNames = Object.keys(componentsBySystem);

  if (isLoading || authLoading) {
      return <div><Skeleton className="h-96 w-full" /></div>
  }

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
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            <Icon className="h-7 w-7" />
                            {equipment.name}
                        </CardTitle>
                        <CardDescription>{equipment.brand} {equipment.model} &bull; {equipment.type}</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(true)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit Equipment</span>
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-2">Most Worn Components</h4>
                <ComponentStatusList components={topComponents} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                  <CardTitle>Component Systems</CardTitle>
                  <CardDescription>
                    Detailed wear status for each component group.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                      {systemNames.map(systemName => (
                          <AccordionItem value={systemName} key={systemName}>
                              <AccordionTrigger className="text-base">
                                <div className="flex items-center gap-4">
                                  <ComponentIcon componentName={systemName} className="h-6 w-6 text-muted-foreground" />
                                  {systemName}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pl-4">
                                  <ComponentStatusList components={componentsBySystem[systemName]} />
                              </AccordionContent>
                          </AccordionItem>
                      ))}
                  </Accordion>
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
        {equipment && <EditEquipmentDialog 
            equipment={equipment} 
            onUpdateEquipment={handleUpdateEquipment}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
        />}
    </>
  );
}
