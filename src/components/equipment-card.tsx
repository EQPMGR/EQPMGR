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
            layout="fill"
            objectFit="cover"
            data-ai-hint={equipment.type === 'Road Bike' ? 'road bike' : 'running shoes'}
          />
        </div>
        <div className="p-6 pb-2">
          <Badge variant={wearBadgeVariant} className="mb-2">
            {`Wear: ${overallWear.toFixed(0)}%`}
          </Badge>
          <CardTitle className="font-headline text-2xl">
            {equipment.name}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Icon className="h-4 w-4" /> {equipment.brand} {equipment.model}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex justify-around text-center text-sm text-muted-foreground">
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
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Component Health</h4>
          <ComponentStatusList components={equipment.components} />
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/equipment/${equipment.id}`}>
            View Details <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
