
'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { equipmentData } from '@/lib/data';
import type { Equipment, Component } from '@/lib/types';
import { EquipmentCard } from './equipment-card';
import { AddEquipmentDialog, type NewEquipmentFormSubmitData } from './add-equipment-dialog';
import { useToast } from '@/hooks/use-toast';
import { bikeDatabase } from '@/lib/bike-database';

export function DashboardPage() {
  const [data, setData] = useState<Equipment[]>(equipmentData);
  const { toast } = useToast();

  async function handleAddEquipment(
    formData: NewEquipmentFormSubmitData
  ) {
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

    const newComponents: Component[] = bikeFromDb.components.map((name, index) => ({
      id: `comp-${Date.now()}-${index}`,
      name: name,
      wearPercentage: 0,
      purchaseDate: formData.purchaseDate,
      lastServiceDate: null,
    }));
      
    const newEquipment: Equipment = {
      id: `new-${Date.now()}`,
      name: formData.name,
      type: bikeFromDb.type,
      brand: bikeFromDb.brand,
      model: bikeFromDb.model,
      modelYear: bikeFromDb.modelYear,
      purchaseDate: formData.purchaseDate,
      purchasePrice: formData.purchasePrice,
      serialNumber: formData.serialNumber,
      imageUrl: bikeFromDb.imageUrl,
      purchaseCondition: 'new', // Defaulting to new for DB items
      totalDistance: 0,
      totalHours: 0,
      components: newComponents,
      maintenanceLog: [],
    };
    
    setData((prevData) => [newEquipment, ...prevData]);
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((item) => (
          <EquipmentCard 
            key={item.id} 
            equipment={item} 
          />
        ))}
      </div>
    </>
  );
}
