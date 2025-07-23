
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { doc, getDocs, updateDoc, collection, query, where, writeBatch, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import type { Equipment, MasterComponent, UserComponent, Component, MaintenanceLog } from '@/lib/types';
import { EquipmentCard } from './equipment-card';
import { AddEquipmentDialog, type EquipmentFormValues } from './add-equipment-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { toDate, toNullableDate } from '@/lib/date-utils';

export function EquipmentListPage() {
  const [data, setData] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const fetchEquipment = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const equipmentQuery = query(collection(db, 'users', uid, 'equipment'));
      const equipmentSnapshot = await getDocs(equipmentQuery);
      const equipmentList: Equipment[] = [];
      
      const allMasterComponentIds = new Set<string>();
      
      equipmentSnapshot.forEach(doc => {
          const equipmentData = doc.data();
           if (Array.isArray(equipmentData.components)) {
                equipmentData.components.forEach((c: any) => {
                    if (c.masterComponentId) {
                        allMasterComponentIds.add(c.masterComponentId);
                    }
                });
            }
      });
      
      const masterComponentsMap = new Map<string, MasterComponent>();
        if (allMasterComponentIds.size > 0) {
            const masterComponentIdsArray = Array.from(allMasterComponentIds);
            for (let i = 0; i < masterComponentIdsArray.length; i += 30) {
                const batchIds = masterComponentIdsArray.slice(i, i + 30);
                 if (batchIds.length > 0) {
                    const masterComponentsQuery = query(collection(db, 'masterComponents'), where('__name__', 'in', batchIds));
                    const querySnapshot = await getDocs(masterComponentsQuery);
                    querySnapshot.forEach(doc => {
                        masterComponentsMap.set(doc.id, { id: doc.id, ...doc.data() } as MasterComponent);
                    });
                }
            }
        }

      equipmentSnapshot.forEach(doc => {
        const equipmentData = doc.data();
        const userComponents: UserComponent[] = (equipmentData.components || []).map((c: any) => ({
                ...c,
                purchaseDate: toDate(c.purchaseDate),
                lastServiceDate: toNullableDate(c.lastServiceDate),
            }));
        
        const combinedComponents: Component[] = userComponents.map(userComp => {
                const masterComp = masterComponentsMap.get(userComp.masterComponentId);
                if (!masterComp) {
                    console.warn(`Master component with ID ${userComp.masterComponentId} not found.`);
                    return {
                        id: userComp.masterComponentId,
                        userComponentId: userComp.id,
                        name: 'Unknown Component',
                        brand: 'Unknown',
                        system: 'Unknown',
                        ...userComp,
                    } as Component;
                }
                return {
                    ...masterComp,
                    userComponentId: userComp.id,
                    wearPercentage: userComp.wearPercentage,
                    purchaseDate: userComp.purchaseDate,
                    lastServiceDate: userComp.lastServiceDate,
                    notes: userComp.notes,
                    size: userComp.size, 
                };
            }).filter((c): c is Component => c !== null);
        
        equipmentList.push({
          id: doc.id,
          ...equipmentData,
          purchaseDate: toDate(equipmentData.purchaseDate),
          components: combinedComponents,
          maintenanceLog: (equipmentData.maintenanceLog || []).map((l: any) => ({
              ...l,
              date: toDate(l.date),
          })),
        } as Equipment);
      });
      
      setData(equipmentList);

    } catch (error) {
      console.error("Error fetching equipment: ", error);
      toast({
        variant: "destructive",
        title: "Error fetching gear",
        description: "Could not load your equipment from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchEquipment(user.uid);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading, fetchEquipment]);


  async function handleAddEquipment(
    formData: EquipmentFormValues
  ) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to add equipment.'
        });
        return;
    }

    const bikeModelId = formData.bikeIdentifier;
    
    const bikeModelRef = doc(db, 'bikeModels', bikeModelId);
    const bikeModelSnap = await getDoc(bikeModelRef);

    if (!bikeModelSnap.exists()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selected bike could not be found in the database.'
      });
      throw new Error('Selected bike not found');
    }
    const bikeFromDb = bikeModelSnap.data();

    // Fetch master components to resolve size variants
    const masterComponentPaths = bikeFromDb.components as string[];
    const masterComponentIds = masterComponentPaths.map(p => p.split('/').pop()!);
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

    const newEquipmentId = crypto.randomUUID();
      
    const userComponents: UserComponent[] = masterComponentPaths.map((masterComponentPath: string) => {
        const masterComponentId = masterComponentPath.split('/').pop()!;
        const masterComp = masterComponentsMap.get(masterComponentId);
        let specificSize = masterComp?.size;

        // If a frame size is selected and the component has size variants, find the correct one.
        if (formData.frameSize && masterComp?.sizeVariants) {
            // Find a case-insensitive key match
            const frameSizeKey = Object.keys(masterComp.sizeVariants).find(
              (key) => key.toLowerCase() === formData.frameSize!.toLowerCase()
            );
            if (frameSizeKey) {
                specificSize = masterComp.sizeVariants[frameSizeKey];
            }
        }

        return {
            id: crypto.randomUUID(),
            masterComponentId: masterComponentId,
            wearPercentage: 0,
            purchaseDate: formData.purchaseDate,
            lastServiceDate: null,
            notes: '',
            size: specificSize, // Save the resolved size
        }
    });

    const newEquipmentData: Omit<Equipment, 'id' | 'components'> & { components: UserComponent[] } = {
        name: formData.name,
        type: bikeFromDb.type,
        brand: bikeFromDb.brand,
        model: bikeFromDb.model,
        modelYear: bikeFromDb.modelYear,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        purchaseCondition: formData.purchaseCondition,
        imageUrl: bikeFromDb.imageUrl,
        totalDistance: 0,
        totalHours: 0,
        maintenanceLog: [],
        components: userComponents,
        serialNumber: formData.serialNumber,
        frameSize: formData.frameSize,
    };
    
    const newEquipmentDocRef = doc(db, 'users', user.uid, 'equipment', newEquipmentId);
    
    await setDoc(newEquipmentDocRef, newEquipmentData);
    await fetchEquipment(user.uid);
  }

  if (isLoading || authLoading) {
    return (
      <>
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
      </>
    )
  }

  if (!user) {
     return (
        <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome to EQPMGR</h2>
            <p className="text-muted-foreground">Please sign in to manage your equipment.</p>
        </div>
     )
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">My Equipment</h2>
          <p className="text-muted-foreground">
            An overview of your gear's health and maintenance status.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
           <Button variant="secondary">
            <Activity className="mr-2 h-4 w-4" />
            Sync Activity
          </Button>
          <AddEquipmentDialog onAddEquipment={handleAddEquipment} />
        </div>
      </div>
      {data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((item) => (
            <EquipmentCard 
              key={item.id} 
              equipment={item}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No Equipment Found</h3>
            <p className="text-muted-foreground">Get started by adding your first piece of gear.</p>
        </div>
      )}
    </>
  );
}
