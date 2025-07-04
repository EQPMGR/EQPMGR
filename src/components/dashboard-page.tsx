
'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { collection, setDoc, doc, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import type { Equipment, Component } from '@/lib/types';
import { EquipmentCard } from './equipment-card';
import { AddEquipmentDialog, type NewEquipmentFormSubmitData } from './add-equipment-dialog';
import { useToast } from '@/hooks/use-toast';
import { bikeDatabase } from '@/lib/bike-database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPage() {
  const [data, setData] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user) {
      const fetchEquipment = async () => {
        try {
          const equipmentCol = collection(db, 'users', user.uid, 'equipment');
          const equipmentSnapshot = await getDocs(equipmentCol);
          const equipmentList = equipmentSnapshot.docs.map(doc => doc.data() as Equipment);
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
      };
      fetchEquipment();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading, toast]);


  async function handleAddEquipment(
    formData: NewEquipmentFormSubmitData
  ) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to add equipment.'
        });
        return;
    }
    const [brand, model, modelYearStr] = formData.bikeIdentifier.split('|');
    const modelYear = parseInt(modelYearStr, 10);
    const bikeFromDb = bikeDatabase.find(
      b => b.brand === brand && b.model === model && b.modelYear === modelYear
    );

    if (!bikeFromDb) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selected bike could not be found in the database.'
      });
      throw new Error('Selected bike not found');
    }

    const newComponents: Component[] = bikeFromDb.components.map((comp, index) => ({
      id: `comp-${Date.now()}-${index}`,
      name: comp.name,
      system: comp.system,
      wearPercentage: 0,
      purchaseDate: formData.purchaseDate,
      lastServiceDate: null,
    }));
      
    const newEquipmentRef = doc(collection(db, 'users', user.uid, 'equipment'));
      
    const newEquipment: Equipment = {
      id: newEquipmentRef.id,
      name: formData.name,
      type: bikeFromDb.type,
      brand: bikeFromDb.brand,
      model: bikeFromDb.model,
      modelYear: bikeFromDb.modelYear,
      purchaseDate: formData.purchaseDate,
      purchasePrice: formData.purchasePrice,
      serialNumber: formData.serialNumber,
      imageUrl: bikeFromDb.imageUrl,
      purchaseCondition: 'new',
      totalDistance: 0,
      totalHours: 0,
      components: newComponents,
      maintenanceLog: [],
    };
    
    await setDoc(newEquipmentRef, newEquipment);
    setData((prevData) => [newEquipment, ...prevData]);
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
            <p className="text-muted-foreground mt-2">Get started by adding your first piece of gear.</p>
        </div>
      )}
    </>
  );
}
