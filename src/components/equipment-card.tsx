import Link from 'next/link';
import { ArrowUpRight, Bike, Footprints } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import type { Equipment } from '@/lib/types';
import { ComponentStatusList } from './component-status-list';
import { Button } from './ui/button';

interface EquipmentCardProps {
  equipment: Equipment;
}

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const Icon = equipment.type.includes('Bike') ? Bike : Footprints;

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardContent className="flex-grow p-4">
        <CardTitle className="font-headline text-xl leading-snug">
            {equipment.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm mt-1">
            <Icon className="h-4 w-4" /> {equipment.brand} {equipment.model}
        </CardDescription>

        <div className="mt-4 grid grid-cols-2 text-center text-sm text-muted-foreground border-t pt-3">
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

        <div className="mt-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Component Health</h4>
          <ComponentStatusList components={equipment.components} />
        </div>
      </CardContent>
      <CardFooter className='p-2'>
        <Button asChild className="w-full">
          <Link href={`/equipment/${equipment.id}`}>
            View Details <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
