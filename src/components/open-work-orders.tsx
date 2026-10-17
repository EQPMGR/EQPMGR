
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wrench, ArrowRight } from 'lucide-react';
import type { WorkOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { toDate } from '@/lib/date-utils';
import { Button } from './ui/button';
import Link from 'next/link';
import { getDb } from '@/backend';
import { Skeleton } from './ui/skeleton';
import { isWorkOrderOpen } from '@/lib/work-orders';

export function OpenWorkOrders() {
  const { user, loading: authLoading } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'New':
      case 'pending':
        return 'secondary';
      case 'Bike Ready':
        return 'outline';
      default:
        return 'default';
    }
  }

  useEffect(() => {
    if (!user) {
        if (!authLoading) {
            setIsLoading(false);
        }
        return;
    };

    setIsLoading(true);
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const database = await getDb();

        unsubscribe = database.onSnapshotQuery<WorkOrder>(
          'workOrders',
          (querySnapshot) => {
            const orders: WorkOrder[] = [];
            querySnapshot.docs.forEach((doc) => {
                const data = doc.data;
                if (!data || !isWorkOrderOpen(data.status)) {
                  return;
                }
                orders.push({
                    ...data,
                    id: doc.id,
                    createdAt: toDate(data.createdAt),
                } as WorkOrder);
            });
            setWorkOrders(orders);
            setIsLoading(false);
          },
          (error) => {
            console.error("Error fetching work orders: ", error);
            setIsLoading(false);
          },
          { type: 'where', field: 'userId', op: '==', value: user.uid }
        );
      } catch (error) {
        console.error("Error initializing work orders listener:", error);
        setIsLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading]);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench /> Open Work Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        ) : workOrders.length > 0 ? (
          <div className="space-y-4">
            {workOrders.map(wo => (
              <div key={wo.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{wo.providerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {wo.equipmentName} - Requested {toDate(wo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={getStatusVariant(wo.status)} >{wo.status === 'pending' ? 'New' : wo.status}</Badge>
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
