'use client'
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Bike,
  ChevronLeft,
  Footprints,
  Puzzle,
  Shield,
  Pencil,
  Trash2,
  Loader2,
  Zap,
} from 'lucide-react';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
import type { Equipment, MaintenanceLog as MaintenanceLogType, Component, MasterComponent, UserComponent } from '@/lib/types';
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
import { toDate, toNullableDate } from '@/lib/date-utils';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

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
    if (name.includes('e-bike')) {
      return <Zap className={className} />;
    }
    // Default icon
    return <Puzzle className={className} />;
}

export default function EquipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEquipment = useCallback(async (uid: string, equipmentId: string) => {
    setIsLoading(true);
    try {
      const equipmentDocRef = doc(db, 'users', uid, 'equipment', equipmentId);
      const equipmentDocSnap = await getDoc(equipmentDocRef);

      if (equipmentDocSnap.exists()) {
        const equipmentData = equipmentDocSnap.data();

        // Fetch components from the subcollection
        const componentsQuery = query(collection(db, 'users', uid, 'equipment', equipmentId, 'components'));
        const componentsSnapshot = await getDocs(componentsQuery);
        const userComponents: UserComponent[] = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserComponent));
        
        const masterComponentIds = [...new Set(userComponents.map(c => c.masterComponentId).filter(Boolean))];
        
        const masterComponentsMap = new Map<string, MasterComponent>();
        if (masterComponentIds.length > 0) {
             for (let i = 0; i < masterComponentIds.length; i += 30) {
                const batchIds = masterComponentIds.slice(i, i + 30);
                if (batchIds.length > 0) {
                    const masterComponentsQuery = query(collection(db, 'masterComponents'), where('__name__', 'in', batchIds));
                    const querySnapshot = await getDocs(masterComponentsQuery);
                    querySnapshot.forEach(doc => {
                        masterComponentsMap.set(doc.id, { id: doc.id, ...doc.data() } as MasterComponent);
                    });
                }
            }
        }

        const combinedComponents: Component[] = userComponents.map(userComp => {
            const masterComp = masterComponentsMap.get(userComp.masterComponentId);
            if (!masterComp) return null; // Gracefully skip if master component is missing
            return {
                ...masterComp,
                ...userComp,
                userComponentId: userComp.id,
                purchaseDate: toDate(userComp.purchaseDate),
                lastServiceDate: toNullableDate(userComp.lastServiceDate),
            };
        }).filter((c): c is Component => c !== null);

        setEquipment({
            ...equipmentData,
            id: equipmentId,
            purchaseDate: toDate(equipmentData.purchaseDate),
            components: combinedComponents,
            maintenanceLog: (equipmentData.maintenanceLog || []).map((l: any) => ({
                ...l,
                date: toDate(l.date),
            })),
        } as Equipment);
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Could not find the requested equipment." });
        setEquipment(undefined);
      }
    } catch (error) {
      console.error("Error fetching equipment details: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load equipment details." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user && params.id) {
        fetchEquipment(user.uid, params.id as string);
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, params.id, authLoading, fetchEquipment]);
  
  const handleUpdateEquipment = async (data: UpdateEquipmentData) => {
    if (!user || !equipment) {
      toast({ variant: "destructive", title: "Error", description: "Could not update equipment." });
      return;
    }
    
    const equipmentDocRef = doc(db, 'users', user.uid, 'equipment', equipment.id);
    await updateDoc(equipmentDocRef, data as any);
    
    // After successful update, re-fetch the data to ensure UI is in sync
    await fetchEquipment(user.uid, equipment.id);
  };

  const handleDeleteEquipment = async () => {
    if (!user || !equipment) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete equipment." });
      return;
    }
    setIsDeleting(true);
    try {
      const equipmentDocRef = doc(db, 'users', user.uid, 'equipment', equipment.id);
      await deleteDoc(equipmentDocRef);

      toast({
        title: "Success!",
        description: "Equipment has been deleted."
      });

      router.push('/equipment');
    } catch (error) {
      console.error("Error deleting equipment: ", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "An error occurred while deleting the equipment."
      });
      setIsDeleting(false);
    }
  };

  const handleAddLog = async (newLog: Omit<MaintenanceLogType, 'id'>) => {
    if (!user || !equipment) return;
    const logWithId = { ...newLog, id: crypto.randomUUID() };
    const updatedLog = [...equipment.maintenanceLog, logWithId];
    
    const equipmentDocRef = doc(db, 'users', user.uid, 'equipment', equipment.id);
    await updateDoc(equipmentDocRef, {
      maintenanceLog: updatedLog.map(l => ({...l, date: toDate(l.date)})),
    });

    setEquipment(prev => prev ? ({ ...prev, maintenanceLog: updatedLog.map(l => ({...l, date: toDate(l.date)})) }) : undefined);
  }

  const systemsToDisplay = useMemo(() => {
    if (!equipment) return [];
    
    const systems = new Set<string>();
    equipment.components.forEach(c => systems.add(c.system));
    
    const preferredOrder = [
        'Drivetrain', 'Suspension', 'E-Bike', 'Brakes', 
        'Wheelset', 'Frameset', 'Cockpit', 'Accessories'
    ];

    return preferredOrder.filter(system => systems.has(system));
  }, [equipment]);

  if (isLoading || authLoading) {
      return <div><Skeleton className="h-96 w-full" /></div>
  }

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Equipment not found</h1>
          <Button asChild variant="link">
            <Link href="/equipment">Go back to Equipment</Link>
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
                <Link href="/equipment">
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
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit Equipment</span>
                                </Button>
                            </DialogTrigger>
                            <EditEquipmentDialog 
                                equipment={equipment} 
                                onUpdateEquipment={handleUpdateEquipment}
                            />
                        </Dialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Equipment</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your
                                    equipment and all of its associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteEquipment} disabled={isDeleting}>
                                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Delete
                                    </AlertDialogAction>
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
                    <Link href={`/equipment/${equipment.id}/${systemName.toLowerCase().replace(/\s+/g, '-')}`} key={systemName}>
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
            
            <MaintenanceLog log={equipment.maintenanceLog} onAddLog={handleAddLog} />
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

    