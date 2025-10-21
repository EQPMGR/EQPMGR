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
import { Wrench, PlusCircle } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { getDashboardData } from './actions';
// REMOVED: import { RecentActivities } from '@/components/recent-activities';
import { StravaDashboardWrapper } from '@/components/strava-dashboard-wrapper'; // ADDED: Import the new wrapper

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<any[]>([]); // Use any[] because of serialized dates
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true);
    try {
        const { openWorkOrders } = await getDashboardData();
        setWorkOrders(openWorkOrders);
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
      fetchWorkOrders();
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
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <Skeleton className="h-48 w-full" />
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
        <div className="lg:col-span-2 space-y-6">
            <Card>
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
                        <TableCell>{formatDate(new Date(order.createdAt), user?.dateFormat)}</TableCell>
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
            {/* Replaced <RecentActivities showTitle={true} /> with the Server Wrapper */}
            <StravaDashboardWrapper /> 
        </div>
        <Card className="h-fit">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <Button variant="secondary" asChild>
                     <Link href="/service-providers">
                        <Wrench className="mr-2 h-4 w-4" /> Request Service
                    </Link>
                </Button>
                 <Button asChild>
                     <Link href="/equipment">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Equipment
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
