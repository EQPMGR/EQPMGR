
'use client';

import { Button } from '@/components/ui/button';
import { EquipmentCard } from '@/components/equipment-card';
import { demoEquipment } from '@/lib/demo-data';

export default function DemoEquipmentListPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">My Equipment (Demo)</h2>
          <p className="text-muted-foreground">
            An overview of your gear's health and maintenance status.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
           <Button variant="secondary" disabled>
            Sync Activity
          </Button>
          <Button disabled>
            Add Equipment
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {demoEquipment.map((item) => (
          <EquipmentCard 
            key={item.id} 
            equipment={item}
          />
        ))}
      </div>
    </>
  );
}
