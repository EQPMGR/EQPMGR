
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
  const [subComponents, setSubComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComponentData = useCallback(async (uid: string, equipmentId: string, userComponentId: string) => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        toast({ variant: 'destructive', title: 'User not found' });
        return;
      }

      const userData = userDocSnap.data();
      const equipmentData = userData.equipment?.[equipmentId];
      if (!equipmentData) {
        toast({ variant: 'destructive', title: 'Equipment not found' });
        return;
      }
      
      const allUserComponents = (equipmentData.components || []) as UserComponent[];

      // Find the main component
      const mainUserComp = allUserComponents.find(c => c.id === userComponentId);
      if (!mainUserComp) {
        toast({ variant: 'destructive', title: 'Component not found' });
        return;
      }

      // Find sub-components
      const subUserComps = allUserComponents.filter(c => c.parentUserComponentId === userComponentId);

      // Gather all required master component IDs
      const masterIdsToFetch = [
        mainUserComp.masterComponentId,
        ...subUserComps.map(sc => sc.masterComponentId)
      ];
      const uniqueMasterIds = [...new Set(masterIdsToFetch)];

      // Fetch all required master components
      const masterCompsMap = new Map<string, MasterComponent>();
      for (let i = 0; i < uniqueMasterIds.length; i += 30) {
        const batchIds = uniqueMasterIds.slice(i, i + 30);
        if (batchIds.length > 0) {
            const masterCompsQuery = query(collection(db, 'masterComponents'), where('__name__', 'in', batchIds));
            const querySnapshot = await getDocs(masterCompsQuery);
            querySnapshot.forEach(doc => masterCompsMap.set(doc.id, { id: doc.id, ...doc.data() } as MasterComponent));
        }
      }

      // Combine main component data
      const mainMasterComp = masterCompsMap.get(mainUserComp.masterComponentId);
      if (mainMasterComp) {
        setComponent({
          ...mainMasterComp,
          ...mainUserComp,
          userComponentId: mainUserComp.id,
          purchaseDate: toDate(mainUserComp.purchaseDate),
          lastServiceDate: toNullableDate(mainUserComp.lastServiceDate),
        });
      }

      // Combine sub-component data
      const combinedSubComponents = subUserComps.map(subUserComp => {
        const masterComp = masterCompsMap.get(subUserComp.masterComponentId);
        if (!masterComp) return null;
        return {
          ...masterComp,
          ...subUserComp,
          userComponentId: subUserComp.id,
          purchaseDate: toDate(subUserComp.purchaseDate),
          lastServiceDate: toNullableDate(subUserComp.lastServiceDate),
        };
      }).filter((c): c is Component => c !== null);

      setSubComponents(combinedSubComponents);

    } catch (error) {
      console.error("Error fetching component details: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load component details." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && params.id && params.componentId) {
      fetchComponentData(user.uid, params.id as string, params.componentId as string);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, params.id, params.componentId, authLoading, toast, fetchComponentData]);

  const handleSuccess = () => {
      if (user && params.id && params.componentId) {
        fetchComponentData(user.uid, params.id as string, params.componentId as string);
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
                <div>
                    <p className="text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">{component.purchaseDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>
                </div>
                 <div>
                    <p className="text-muted-foreground">Last Service</p>
                    <p className="font-medium">{component.lastServiceDate ? component.lastServiceDate.toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</p>
                </div>
            </div>

            {subComponents.length > 0 && (
                 <div className="mt-6 border-t pt-6">
                    <h4 className="font-semibold mb-2">Attached Components</h4>
                    <div className="space-y-4">
                       {subComponents.map(sub => (
                         <Card key={sub.userComponentId} className="p-4 bg-muted/50">
                            <h5 className="font-medium">{sub.name}</h5>
                            <p className="text-sm text-muted-foreground">{sub.brand} {sub.model}</p>
                            <div className="mt-2">
                                <ComponentStatusList components={[sub]} />
                            </div>
                         </Card>
                       ))}
                    </div>
                </div>
            )}

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
                           parentComponent={component}
                           existingSubComponents={subComponents}
                           onSuccess={handleSuccess}
                       >
                         <Button variant="secondary">
                            <Pencil className="mr-2 h-4 w-4"/>
                            Edit Sub-Components
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

