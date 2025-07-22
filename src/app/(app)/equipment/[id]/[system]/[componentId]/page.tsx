
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
import { EditComponentDialog, type FormValues as EditComponentFormValues } from '@/components/edit-component-dialog';
import { updateUserComponentAction } from '@/app/(app)/equipment/[id]/actions';

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

  const handleEditSuccess = async (data: EditComponentFormValues) => {
      if (!user || !component) {
        toast({ variant: "destructive", title: "Error", description: "Not authorized or component not found." });
        return;
      }
      try {
        await updateUserComponentAction({
          userId,
          equipmentId: params.id as string,
          userComponentId: component.userComponentId,
          updatedData: {
            chainring1: data.chainring1 || null,
            chainring1_brand: data.chainring1_brand || null,
            chainring1_model: data.chainring1_model || null,
            chainring2: data.chainring2 || null,
            chainring2_brand: data.chainring2_brand || null,
            chainring2_model: data.chainring2_model || null,
            chainring3: data.chainring3 || null,
            chainring3_brand: data.chainring3_brand || null,
            chainring3_model: data.chainring3_model || null,
          },
        });
        toast({ title: 'Component Updated!', description: 'Your changes have been saved.' });
        // Refetch data to show the update
        await fetchComponent(user.uid, params.id as string, params.componentId as string);
      } catch (error: any) {
        console.error('Update failed:', error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      }
  }

  const handleReplaceSuccess = () => {
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
      const teethKey = `chainring${ringNum}` as keyof Component;
      const brandKey = `chainring${ringNum}_brand` as keyof Component;
      const modelKey = `chainring${ringNum}_model` as keyof Component;

      const teeth = component[teethKey];
      const brand = component[brandKey];
      const model = component[modelKey];
      
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
                        onSuccess={handleReplaceSuccess}
                    />
                    {isCrankset && user && (
                       <EditComponentDialog 
                           component={component}
                           onSave={handleEditSuccess}
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
