import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Bike, Footprints } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Equipment } from '@/lib/types';
import { ComponentStatusList } from './component-status-list';
import { Button } from './ui/button';

interface EquipmentCardProps {
  equipment: Equipment;
}

const getOverallWear = (equipment: Equipment) => {
  if (!equipment.components || equipment.components.length === 0) return 0;
  const totalWear = equipment.components.reduce(
    (acc, c) => acc + c.wearPercentage,
    0
  );
  return totalWear / equipment.components.length;
};

const getAIHint = (type: string) => {
    if (type.includes('Road Bike')) return 'road bike';
    if (type.includes('Mountain Bike')) return 'mountain bike';
    if (type.includes('Running Shoes')) return 'running shoes';
    return 'sports equipment';
}

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const overallWear = getOverallWear(equipment);
  const Icon = equipment.type.includes('Bike') ? Bike : Footprints;

  let wearBadgeVariant: 'default' | 'secondary' | 'destructive' = 'default';
  if (overallWear > 90) {
    wearBadgeVariant = 'destructive';
  } else if (overallWear > 70) {
    wearBadgeVariant = 'secondary';
  }

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          <Image
            src={equipment.imageUrl}
            alt={equipment.name}
            fill
            className="object-cover"
            data-ai-hint={getAIHint(equipment.type)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <Badge variant={wearBadgeVariant} className="mb-2">
            {`Wear: ${overallWear.toFixed(0)}%`}
        </Badge>
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
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/equipment/${equipment.id}`}>
            View Details <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
