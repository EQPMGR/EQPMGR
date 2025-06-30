'use client';

import { useState } from 'react';
import { PlusCircle, Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { equipmentData } from '@/lib/data';
import type { Equipment } from '@/lib/types';
import { EquipmentCard } from './equipment-card';

export function DashboardPage() {
  const [data, setData] = useState<Equipment[]>(equipmentData);

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
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((item) => (
          <EquipmentCard key={item.id} equipment={item} />
        ))}
      </div>
    </>
  );
}
