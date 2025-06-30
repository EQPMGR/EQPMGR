'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { equipmentData } from '@/lib/data';
import type { Equipment } from '@/lib/types';
import { EquipmentCard } from './equipment-card';
import { Icons } from './icons';

export function DashboardPage() {
  const [data, setData] = useState<Equipment[]>(equipmentData);

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2>
          <p className="text-muted-foreground">
            Get an overview of your equipment's health and maintenance status.
          </p>
        </div>
        <div className="flex items-center space-x-2">
           <Button variant="secondary">
            <Icons.strava className="mr-2 h-4 w-4" />
            Sync with Strava
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
