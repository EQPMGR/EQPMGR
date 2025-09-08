

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from "@/hooks/use-auth";
import type { WorkOrder } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, ArrowUpRight } from 'lucide-react';
import { formatDate, toDate } from '@/lib/date-utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkOrders = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const workOrdersQuery = query(
        collection(db, 'workOrders'),
        where('userId', '==', uid),
        where('status', 'not-in', ['Completed', 'cancelled'])
      );
      const querySnapshot = await getDocs(workOrdersQuery);
      const orders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: toDate(data.createdAt),
          userConsent: {
            ...data.userConsent,
            timestamp: toDate(data.userConsent?.timestamp),
          }
        } as WorkOrder;
      });
      setWorkOrders(orders);
    } catch (error: any) {
      console.error("Failed to fetch dashboard stats:", error);
      toast({
        variant: 'destructive',
        title: 'Error Fetching Work Orders',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchWorkOrders(user.uid);
    } else {
      setIsLoading(false);
    }
  }, [user, fetchWorkOrders]);


  const getStatusBadgeVariant = (status: WorkOrder['status']): 'secondary' | 'default' | 'outline' => {
      switch(status) {
          case 'pending': return 'outline';
          case 'accepted': return 'default';
          case 'in-progress': return 'secondary';
          default: return 'outline';
      }
  }

  if (isLoading) {
      return (
          <>
            <div className="flex items-center justify-between space-y-2 mb-6">
                <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
              <div className="mt-6">
                <Skeleton className="h-64 w-full" />
              </div>
          </>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2>
          <p className="text-muted-foreground">
            A quick overview of your gear and services.
          </p>
        </div>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open Work Orders</CardTitle>
            <CardDescription>
              Track the status of your current service requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders && workOrders.length > 0 ? (
                  workOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.providerName}</TableCell>
                      <TableCell>{order.equipmentName}</TableCell>
                      <TableCell className="capitalize">{order.serviceType.replace('-', ' ')}</TableCell>
                       <TableCell>{formatDate(order.createdAt, user?.dateFormat)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No open work orders.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <Button variant="secondary" asChild>
                     <Link href="/service-providers">
                        <Wrench className="mr-2 h-4 w-4" /> Request Service
                    </Link>
                </Button>
                 <Button variant="outline" asChild>
                     <Link href="/admin">
                        <ArrowUpRight className="mr-2 h-4 w-4" /> Go to Admin
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
