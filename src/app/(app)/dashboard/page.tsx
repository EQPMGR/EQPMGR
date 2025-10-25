
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { fetchOpenWorkOrders } from './actions';
import type { WorkOrder } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';

function OpenWorkOrders() {
    const { user } = useAuth();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchOpenWorkOrders(user.uid)
                .then(setWorkOrders)
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        );
    }
    
    const getStatusVariant = (status: WorkOrder['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
        switch(status) {
            case 'pending': return 'outline';
            case 'accepted': return 'secondary';
            case 'in-progress': return 'default';
            default: return 'outline';
        }
    }

    return (
        <>
            {workOrders.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Equipment</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.equipmentName}</TableCell>
                                <TableCell className="capitalize">{order.serviceType.replace('-', ' ')}</TableCell>
                                <TableCell>{order.providerName}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(order.status)} className="capitalize">{order.status}</Badge></TableCell>
                                <TableCell>{formatDate(order.createdAt, user?.dateFormat)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                 <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">No Open Work Orders</h3>
                    <p className="text-muted-foreground">When you request service, it will appear here.</p>
                </div>
            )}
        </>
    )
}


export default function DashboardPage() {
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Open Work Orders</CardTitle>
          <CardDescription>
            A summary of your equipment currently being serviced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenWorkOrders />
        </CardContent>
      </Card>
    </div>
  );
}
