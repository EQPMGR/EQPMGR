
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from "@/hooks/use-auth";
import { getDashboardData } from '@/app/(app)/dashboard/actions';
import type { WorkOrder } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, Wrench, AlertTriangle, ArrowUpRight, PlusCircle } from 'lucide-react';
import { formatDate, toDate } from '@/lib/date-utils';

interface DashboardStats {
    openWorkOrders: WorkOrder[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only fetch data if the user is logged in and their email is verified.
    if (user && user.emailVerified) {
        getDashboardData()
            .then(data => {
                // Since the server now sends ISO strings, we need to convert them back to Date objects on the client.
                const hydratedWorkOrders = data.openWorkOrders.map(order => ({
                    ...order,
                    createdAt: toDate(order.createdAt),
                    userConsent: {
                        ...order.userConsent,
                        timestamp: toDate(order.userConsent.timestamp)
                    }
                }))
                setStats({ openWorkOrders: hydratedWorkOrders as WorkOrder[] });
            })
            .catch(error => {
                console.error("Failed to fetch dashboard stats:", error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    } else if (user) {
        // Handle the case where user is logged in but not verified
        setIsLoading(false);
    }
  }, [user]);

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
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Work Orders</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openWorkOrders.length ?? 0}</div>
             <p className="text-xs text-muted-foreground">Active service requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Due Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Items needing attention</p>
          </CardContent>
        </Card>
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
                {stats && stats.openWorkOrders.length > 0 ? (
                  stats.openWorkOrders.map((order) => (
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
                <Button asChild>
                    <Link href="/equipment">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Equipment
                    </Link>
                </Button>
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
