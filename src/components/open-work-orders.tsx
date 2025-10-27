
'use client';

import { Wrench, ArrowRight } from 'lucide-react';
import type { WorkOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/date-utils';
import { Button } from './ui/button';
import Link from 'next/link';

interface OpenWorkOrdersProps {
  initialWorkOrders: WorkOrder[];
}

export function OpenWorkOrders({ initialWorkOrders }: OpenWorkOrdersProps) {
  const { user } = useAuth();

  const getStatusVariant = (status: WorkOrder['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
      case 'in-progress':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench /> Open Work Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {initialWorkOrders.length > 0 ? (
          <div className="space-y-4">
            {initialWorkOrders.map(wo => (
              <div key={wo.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{wo.providerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {wo.equipmentName} - Requested {formatDate(wo.createdAt, user?.dateFormat)}
                  </p>
                </div>
                <Badge variant={getStatusVariant(wo.status)} className="capitalize">{wo.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No open work orders found.</p>
        )}
      </CardContent>
      <CardFooter>
          <Button asChild variant="secondary" className="w-full">
              <Link href="/service-providers">
                  Request New Service
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
