
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { toDate, toNullableDate } from '@/lib/date-utils';
import type { Component } from '@/lib/types';
import { ComponentStatusList } from '@/components/component-status-list';

export default function ComponentDetailPage() {
  const params = useParams<{ id: string; system: string; componentId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [component, setComponent] = useState<Component | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && params.id && params.componentId) {
       const fetchComponent = async () => {
        setIsLoading(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const equipmentData = userData.equipment?.[params.id];

            if (equipmentData) {
              const foundComponent = (equipmentData.components || []).find((c: any) => c.id === params.componentId);

              if (foundComponent) {
                setComponent({
                  ...foundComponent,
                  purchaseDate: toDate(foundComponent.purchaseDate),
                  lastServiceDate: toNullableDate(foundComponent.lastServiceDate),
                });
              } else {
                toast({ variant: "destructive", title: "Component not found" });
                setComponent(undefined);
              }
            } else {
               toast({ variant: "destructive", title: "Equipment not found" });
               setComponent(undefined);
            }
          }
        } catch (error) {
          console.error("Error fetching component details: ", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load component details." });
        } finally {
          setIsLoading(false);
        }
      };
      fetchComponent();
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, params.id, params.componentId, authLoading, toast]);


  if (isLoading || authLoading) {
      return (
        <div>
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      )
  }

  if (!component) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Component not found</h1>
        <Button asChild variant="link">
            <Link href={`/equipment/${params.id}`}>Go back to Equipment</Link>
        </Button>
      </div>
    );
  }

  return (
     <>
      <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" asChild>
              <Link href={`/equipment/${params.id}/${params.system}`}>
                  <ChevronLeft className="h-4 w-4" />
                  Back to System
              </Link>
          </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">{component.name}</CardTitle>
          <CardDescription>{component.brand} {component.model}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-4">Component details and maintenance options will be available here.</p>
            <div className="mt-4">
              <ComponentStatusList components={[component]} />
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-6">
                <div>
                    <p className="text-muted-foreground">System</p>
                    <p className="font-medium capitalize">{component.system}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">{component.purchaseDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>
                </div>
                 <div>
                    <p className="text-muted-foreground">Last Service</p>
                    <p className="font-medium">{component.lastServiceDate ? component.lastServiceDate.toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</p>
                </div>
            </div>
             <div className="mt-6 border-t pt-6">
                <h4 className="font-semibold mb-2">Actions</h4>
                <div className="flex gap-2">
                    <Button>Replace Part</Button>
                    <Button variant="secondary">Log Maintenance</Button>
                </div>
             </div>
        </CardContent>
      </Card>
     </>
  );
}
