
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Bike, Footprints, Trash2, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import type { Equipment } from '@/lib/types';
import { ComponentStatusList } from './component-status-list';
import { Button } from './ui/button';

interface EquipmentCardProps {
  equipment: Equipment;
  onDelete: (equipmentId: string) => Promise<void>;
}

export function EquipmentCard({ equipment, onDelete }: EquipmentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const Icon = (equipment.type !== 'Running Shoes' && equipment.type !== 'Other') ? Bike : Footprints;

  // Sort components by wear percentage and take the top 4
  const topComponents = [...equipment.components]
    .sort((a, b) => b.wearPercentage - a.wearPercentage)
    .slice(0, 4);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(equipment.id);
    // No need to set isDeleting to false, as the component will be unmounted.
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardContent className="flex flex-grow flex-col p-6">
        <CardTitle className="font-headline text-xl leading-snug">
            {equipment.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm mt-1 mb-4">
            <Icon className="h-4 w-4" /> {equipment.brand} {equipment.model}
        </CardDescription>
        
        <div className="flex-grow mb-4">
          <ComponentStatusList components={topComponents} />
        </div>

        <div className="grid grid-cols-2 text-center text-sm text-muted-foreground border-t pt-3">
          <div>
            <p className="font-semibold text-lg text-foreground">
              {equipment.totalDistance}
            </p>
            <p>km</p>
          </div>
          <div>
            <p className="font-semibold text-lg text-foreground">
              {equipment.totalHours}
            </p>
            <p>hours</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className='p-2 mt-auto flex gap-2'>
        <Button asChild className="w-full">
          <Link href={`/equipment/${equipment.id}`}>
            View Details <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="shrink-0">
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
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
