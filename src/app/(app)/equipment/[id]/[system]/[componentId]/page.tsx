
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { toDate, toNullableDate } from '@/lib/date-utils';
import type { Component, MasterComponent, UserComponent } from '@/lib/types';
import { ComponentStatusList } from '@/components/component-status-list';
import { ReplaceComponentDialog } from '@/components/replace-component-dialog';
import { EditComponentDialog } from '@/components/edit-component-dialog';

export default function ComponentDetailPage() {
  const params = useParams<{ id: string; system: string; componentId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [component, setComponent] = useState<Component | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchComponent = useCallback(async (uid: string, equipmentId: string, userComponentId: string) => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const equipmentData = userData.equipment?.[equipmentId];

        if (equipmentData) {
          const userComp = (equipmentData.components as UserComponent[]).find(c => c.id === userComponentId);

          if (userComp) {
            const masterCompRef = doc(db, 'masterComponents', userComp.masterComponentId);
            const masterCompSnap = await getDoc(masterCompRef);

            if (masterCompSnap.exists()) {
              const masterComp = { id: masterCompSnap.id, ...masterCompSnap.data() } as MasterComponent;
              setComponent({
                ...masterComp,
                ...userComp, // This will overwrite master fields with user-specific ones if they exist
                userComponentId: userComp.id,
                purchaseDate: toDate(userComp.purchaseDate),
                lastServiceDate: toNullableDate(userComp.lastServiceDate),
              });
            } else {
              toast({ variant: "destructive", title: "Master Component not found" });
            }
          } else {
            toast({ variant: "destructive", title: "Component not found" });
          }
        } else {
           toast({ variant: "destructive", title: "Equipment not found" });
        }
      }
    } catch (error) {
      console.error("Error fetching component details: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load component details." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user && params.id && params.componentId) {
      fetchComponent(user.uid, params.id as string, params.componentId as string);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, params.id, params.componentId, authLoading, toast, fetchComponent]);

  const handleSuccess = () => {
      if (user && params.id && params.componentId) {
        fetchComponent(user.uid, params.id as string, params.componentId as string);
    }
  }

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
  
  const isCrankset = component.name.toLowerCase().includes('crankset');

  const renderChainringDetail = (ringNum: 1 | 2 | 3) => {
      const teeth = component[`chainring${ringNum}` as keyof Component];
      const brand = component[`chainring${ringNum}_brand` as keyof Component];
      const model = component[`chainring${ringNum}_model` as keyof Component];
      if (!teeth) return null;
      return (
        <div>
            <p className="text-muted-foreground">Chainring {ringNum}</p>
            <p className="font-medium">{teeth}{brand ? ` by ${brand}` : ''}{model ? ` (${model})` : ''}</p>
        </div>
      )
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
            <div className="mt-4">
              <ComponentStatusList components={[component]} />
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-6">
                <div>
                    <p className="text-muted-foreground">System</p>
                    <p className="font-medium capitalize">{component.system}</p>
                </div>
                 {component.size && <div><p className="text-muted-foreground">Size</p><p className="font-medium">{component.size}</p></div>}
                 {renderChainringDetail(1)}
                 {renderChainringDetail(2)}
                 {renderChainringDetail(3)}
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
                    <ReplaceComponentDialog 
                        userId={user?.uid} 
                        equipmentId={params.id as string} 
                        componentToReplace={component}
                        onSuccess={handleSuccess}
                    />
                    {isCrankset && user && (
                       <EditComponentDialog 
                           userId={user.uid}
                           equipmentId={params.id as string}
                           component={component}
                           onSuccess={handleSuccess}
                       >
                         <Button variant="secondary">
                            <Pencil className="mr-2 h-4 w-4"/>
                            Edit
                        </Button>
                       </EditComponentDialog>
                    )}
                    <Button variant="secondary">Log Maintenance</Button>
                </div>
             </div>
        </CardContent>
      </Card>
     </>
  );
}
