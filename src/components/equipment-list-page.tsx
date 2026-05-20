

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Footprints, Bike } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { BikeModelComponent, Equipment, MasterComponent, UserComponent, Component } from '@/lib/types';
import { EquipmentCard } from './equipment-card';
import { AddEquipmentDialog, type EquipmentFormValues } from './add-equipment-dialog';
import { AddShoesDialog, type ShoesFormValues } from './add-shoes-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getDb } from '@/backend';
import { Skeleton } from '@/components/ui/skeleton';
import { toDate, toNullableDate } from '@/lib/date-utils';
import { PageContainer } from '@/components/page-container';

export function EquipmentListPage() {
  const [data, setData] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const fetchEquipment = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const db = await getDb();
      let equipmentSnapshot = await db.getDocs<Equipment>(
        'equipment',
        { type: 'where', field: 'userId', op: '==', value: uid }
      );

      if (equipmentSnapshot.empty) {
        equipmentSnapshot = await db.getDocs<Equipment>(
          'equipment',
          { type: 'where', field: 'appUserId', op: '==', value: uid }
        );
      }

      const equipmentPromises = equipmentSnapshot.docs.map(async (equipmentDoc) => {
        const equipmentData = equipmentDoc.data;

        // Fetch components for each equipment
        const componentsSnapshot = await db.getDocs<UserComponent>(
          'components',
          { type: 'where', field: 'equipmentId', op: '==', value: equipmentDoc.id }
        );
        const userComponents: UserComponent[] = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data } as UserComponent));

        // Gather all unique master component IDs from this equipment's components
        const masterComponentIds = [...new Set(userComponents.map(c => c.masterComponentId).filter(Boolean))];

        const masterComponentsMap = new Map<string, MasterComponent>();
        if (masterComponentIds.length > 0) {
             // 'in' queries are limited to 30 values, so we batch them.
             for (let i = 0; i < masterComponentIds.length; i += 30) {
                const batchIds = masterComponentIds.slice(i, i + 30);
                 if (batchIds.length > 0) {
                    const querySnapshot = await db.getDocs<MasterComponent>(
                      'masterComponents',
                      { type: 'where', field: 'id', op: 'in', value: batchIds }
                    );
                    querySnapshot.docs.forEach(doc => {
                        masterComponentsMap.set(doc.id, { id: doc.id, ...doc.data } as MasterComponent);
                    });
                }
            }
        }

        const combinedComponents: Component[] = userComponents.map(userComp => {
            const masterComp = masterComponentsMap.get(userComp.masterComponentId);
             if (!masterComp) {
                console.warn(`Master component with ID ${userComp.masterComponentId} not found.`);
                return null;
            }
            return {
                ...masterComp,
                ...userComp, // User-specific data overrides master data
                userComponentId: userComp.id,
                purchaseDate: toDate(userComp.purchaseDate),
                lastServiceDate: toNullableDate(userComp.lastServiceDate),
            };
        }).filter((c): c is Component => c !== null);

        return {
          id: equipmentDoc.id,
          ...equipmentData,
          purchaseDate: toDate(equipmentData.purchaseDate),
          components: combinedComponents,
          maintenanceLog: (equipmentData.maintenanceLog || []).map((l: any) => ({
              ...l,
              date: toDate(l.date),
          })),
        } as Equipment;
      });

      const equipmentList = await Promise.all(equipmentPromises);
      setData(equipmentList.filter(e => e !== null) as Equipment[]);

    } catch (error: any) {
      console.error("Error fetching equipment: ", error);
      let description = "Could not load your equipment from the database.";
      if (error.code === 'permission-denied') {
          description = "You don't have permission to view this gear. Check Firestore rules."
      }
      toast({
        variant: "destructive",
        title: "Error fetching gear",
        description: description,
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
        throw new Error("User not authenticated");
    }

    const bikeModelId = formData.bikeIdentifier;
    const db = await getDb();
    const batch = db.batch();

    try {
        const bikeModelSnap = await db.getDoc('bikeModels', bikeModelId);

        if (!bikeModelSnap.exists) {
          throw new Error('Selected bike could not be found in the database.');
        }
        const bikeFromDb = bikeModelSnap.data!;

        // 1. Create the main equipment document in its subcollection
        const newEquipmentId = db.generateId();
        const purchaseDate = formData.purchaseDate ?? new Date();
        const newEquipmentData: Omit<Equipment, 'id' | 'components'> = {
            name: formData.name,
            type: bikeFromDb.type ?? bikeFromDb.bikeType ?? 'Unknown',
            brand: bikeFromDb.brand,
            model: bikeFromDb.model,
            modelYear: bikeFromDb.modelYear,
            purchaseDate,
            purchasePrice: formData.purchasePrice,
            purchaseCondition: formData.purchaseCondition,
            imageUrl: bikeFromDb.imageUrl,
            totalDistance: formData.estimatedMileage || 0,
            totalHours: 0,
            maintenanceLog: [],
            serialNumber: formData.serialNumber || '',
            frameSize: formData.frameSize || '',
        };
        console.log('Adding equipment data', {
          equipmentId: newEquipmentId,
          ...newEquipmentData,
          userId: user.uid,
        });

        batch.set('equipment', newEquipmentId, {
          ...newEquipmentData,
          userId: user.uid,
          appUserId: user.uid,
        });

        const bikeModelComponentsSnapshot = await db.getDocs<BikeModelComponent>(
          'bikeModelComponents',
          { type: 'where', field: 'bikeModelId', op: '==', value: bikeModelId }
        );

        const bikeModelComponents = bikeModelComponentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data } as BikeModelComponent));

        if (bikeModelComponents.length > 0) {
          const masterComponentIds = [...new Set(bikeModelComponents.map(c => c.masterComponentId).filter(Boolean))];
          const masterComponentsMap = new Map<string, MasterComponent>();

          for (let i = 0; i < masterComponentIds.length; i += 30) {
              const batchIds = masterComponentIds.slice(i, i + 30);
              if (batchIds.length > 0) {
                const querySnapshot = await db.getDocs<MasterComponent>(
                  'masterComponents',
                  { type: 'where', field: 'id', op: 'in', value: batchIds }
                );
                querySnapshot.docs.forEach(doc => {
                  masterComponentsMap.set(doc.id, { id: doc.id, ...doc.data } as MasterComponent);
                });
              }
          }

          bikeModelComponents.forEach((bikeComponent) => {
              const masterComp = masterComponentsMap.get(bikeComponent.masterComponentId);
              if (!masterComp) {
                  console.warn(`Master component ${bikeComponent.masterComponentId} not found when adding equipment.`);
                  return;
              }

              const newComponentId = db.generateId();
              const componentName = bikeComponent.componentName || masterComp.name;

              const userComponent: Partial<UserComponent> = {
                  id: newComponentId,
                  masterComponentId: bikeComponent.masterComponentId,
                  name: componentName,
                  wearPercentage: 0,
                  purchaseDate,
                  lastServiceDate: null,
                  notes: '',
              };

              let resolvedSize: string | undefined = bikeComponent.size || masterComp.size;

              if (formData.frameSize && !resolvedSize && masterComp.sizeVariants) {
                  try {
                      const variants = JSON.parse(masterComp.sizeVariants || '{}');
                      const frameSizeKey = Object.keys(variants).find(key => key.toLowerCase() === formData.frameSize!.toLowerCase());
                      if (frameSizeKey) {
                        resolvedSize = variants[frameSizeKey];
                      }
                  } catch (e) {
                      console.error('Could not parse sizeVariants JSON', masterComp.sizeVariants);
                  }
              }

              if (resolvedSize) {
                userComponent.size = resolvedSize;
              }

              const componentDoc: Partial<UserComponent> = {
                ...userComponent,
                equipmentId: newEquipmentId,
                userId: user.uid,
              };
              batch.set('components', newComponentId, componentDoc as any);
          });
        }

        await batch.commit();
        await fetchEquipment(user.uid);

    } catch (error: any) {
        console.error("Failed to add equipment:", error);
        toast({
            variant: "destructive",
            title: "Failed to Add Equipment",
            description: error?.message || "There was an issue adding the equipment. Please try again.",
        });
        // Re-throw to be caught by dialog
        throw error;
    }
  }

  async function handleAddShoes(
    formData: ShoesFormValues
  ) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to add shoes.'
        });
        throw new Error("User not authenticated");
    }

    try {
        const db = await getDb();
        const batch = db.batch();
        const masterComponentSnap = await db.getDoc('masterComponents', formData.shoeId);

        if (!masterComponentSnap.exists) {
          throw new Error('Selected shoes could not be found in the database.');
        }
        const shoeFromDb = masterComponentSnap.data! as MasterComponent;

        // 1. Create the main equipment document for the shoes
        const newEquipmentId = db.generateId();
        const newShoeData: Omit<Equipment, 'id' | 'components' | 'maintenanceLog'> & { associatedEquipmentIds?: string[] } = {
            name: `${shoeFromDb.brand} ${shoeFromDb.model}`,
            type: 'Cycling Shoes', // Specific type for shoes
            brand: shoeFromDb.brand!,
            model: shoeFromDb.model!,
            modelYear: new Date().getFullYear(), // Or a default/not applicable value
            purchaseDate: formData.purchaseDate ?? new Date(),
            purchasePrice: formData.purchasePrice,
            purchaseCondition: formData.purchaseCondition,
            size: `${formData.size} ${formData.shoeSizeSystem.toUpperCase()}`,
            imageUrl: 'https://placehold.co/600x400.png', // Placeholder
            totalDistance: 0,
            totalHours: 0,
            associatedEquipmentIds: formData.associatedBikeIds,
        };
        console.log('Adding shoe equipment data', {
          equipmentId: newEquipmentId,
          ...newShoeData,
          userId: user.uid,
        });

        batch.set('equipment', newEquipmentId, {
          ...newShoeData,
          userId: user.uid,
          appUserId: user.uid,
        });

        // 2. Create the single component entry for the shoes themselves in the components table
        const newComponentId = db.generateId();
        const userComponent: UserComponent = {
            id: newComponentId,
            masterComponentId: formData.shoeId,
            wearPercentage: 0,
            purchaseDate: formData.purchaseDate ?? new Date(),
            lastServiceDate: null,
            size: String(formData.size),
            notes: '',
        };
        batch.set('components', newComponentId, {
          ...userComponent,
          equipmentId: newEquipmentId,
          userId: user.uid,
        });
        await batch.commit();
        await fetchEquipment(user.uid);

    } catch (error) {
        console.error("Failed to add shoes:", error);
        toast({
            variant: "destructive",
            title: "Failed to Add Shoes",
            description: "There was an issue adding your shoes. Please try again.",
        });
        throw error;
    }
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
      <PageContainer>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Welcome to EQPMGR</h2>
          <p className="text-muted-foreground">Please sign in to manage your equipment.</p>
        </div>
      </PageContainer>
    )
  }

  const bikes = data.filter(e => e.type !== 'Cycling Shoes');

  return (
    <PageContainer>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">My Equipment</h2>
          <p className="text-muted-foreground">
            An overview of your gear's health and maintenance status.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Button variant="secondary" onClick={() => router.push('/settings/apps')}>
            <Activity className="mr-2 h-4 w-4" />
            Sync Activity
          </Button>
          <AddEquipmentDialog onAddEquipment={handleAddEquipment} />
          <AddShoesDialog onAddShoes={handleAddShoes} allBikes={bikes} />
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
    </PageContainer>
  );
}
