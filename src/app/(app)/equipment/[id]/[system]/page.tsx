
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ArrowUpRight, PlusCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getDb } from '@/backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { toDate, toNullableDate } from '@/lib/date-utils';
import type { Equipment, Component, MasterComponent, UserComponent } from '@/lib/types';
import { ComponentStatusList } from '@/components/component-status-list';
import { AddComponentDialog } from '@/components/add-component-dialog';

export default function SystemDetailPage() {
  const params = useParams<{ id: string; system: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const systemName = useMemo(() => {
    if (!params.system) return '';
    return params.system.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [params.system]);

  const fetchEquipmentAndComponents = useCallback(async (uid: string, equipmentId: string) => {
    setIsLoading(true);
    try {
      const database = await getDb();
      const equipmentDocSnap = await database.getDocFromSubcollection<Equipment>(`users/${uid}`, 'equipment', equipmentId);

      if (equipmentDocSnap.exists) {
        const equipmentData = equipmentDocSnap.data;
        setEquipment({
          ...equipmentData,
          id: equipmentId,
          purchaseDate: toDate(equipmentData.purchaseDate),
          components: [], // Components are fetched separately
          maintenanceLog: (equipmentData.maintenanceLog || []).map((l: any) => ({
              ...l,
              date: toDate(l.date),
          })),
        } as Equipment);
      } else {
         toast({ variant: "destructive", title: "Not Found", description: "Could not find the requested equipment." });
         setEquipment(undefined);
      }

      // Fetch components from the subcollection
      const componentsSnapshot = await database.getDocsFromSubcollection<UserComponent>(
        `users/${uid}/equipment/${equipmentId}`,
        'components'
      );
      const userComponents: UserComponent[] = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data } as UserComponent));

      const masterComponentIds = [...new Set(userComponents.map(c => c.masterComponentId).filter(Boolean))];
      const masterComponentsMap = new Map<string, MasterComponent>();

      if (masterComponentIds.length > 0) {
           for (let i = 0; i < masterComponentIds.length; i += 30) {
              const batchIds = masterComponentIds.slice(i, i + 30);
               if (batchIds.length > 0) {
                  const querySnapshot = await database.getDocs<MasterComponent>(
                    'masterComponents',
                    { type: 'where', field: '__name__', op: 'in', value: batchIds }
                  );
                  querySnapshot.docs.forEach(doc => {
                      masterComponentsMap.set(doc.id, { id: doc.id, ...doc.data } as MasterComponent);
                  });
              }
          }
      }

      const combinedComponents: Component[] = userComponents.map(userComp => {
          const masterComp = masterComponentsMap.get(userComp.masterComponentId);
          if (!masterComp) return null;
          return {
              ...masterComp,
              ...userComp,
              userComponentId: userComp.id,
              purchaseDate: toDate(userComp.purchaseDate),
              lastServiceDate: toNullableDate(userComp.lastServiceDate),
          };
      }).filter((c): c is Component => c !== null);

      setComponents(combinedComponents);

    } catch (error) {
      console.error("Error fetching equipment details: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load equipment details." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user && params.id) {
        fetchEquipmentAndComponents(user.uid, params.id as string);
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, params.id, authLoading, fetchEquipmentAndComponents]);
  
  const handleSuccess = () => {
    if (user && params.id) {
        fetchEquipmentAndComponents(user.uid, params.id as string);
    }
  }

  const systemComponents = useMemo(() => {
    if (!components) return [];
    const systemSlug = params.system.replace(/-/g, ' ').toLowerCase();
    // Filter out sub-components from this main list view
    return components.filter(c => c.system.toLowerCase() === systemSlug && !c.parentUserComponentId);
  }, [components, params.system]);
  
  if (isLoading || authLoading) {
      return (
        <div>
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      )
  }

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Equipment not found</h1>
          <Button asChild variant="link">
            <Link href="/equipment">Go back to Equipment</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
          <Button variant="outline" size="sm" asChild>
              <Link href={`/equipment/${params.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                  Back to {equipment.name}
              </Link>
          </Button>
           {user && (
            <AddComponentDialog 
                userId={user.uid}
                equipmentId={params.id as string}
                system={systemName}
                onSuccess={handleSuccess}
            >
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Component
                </Button>
            </AddComponentDialog>
           )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">{systemName} Components</CardTitle>
          <CardDescription>Details for each component in the {systemName.toLowerCase()} system.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemComponents.map(component => (
            <Link href={`/equipment/${params.id}/${params.system}/${component.userComponentId}`} key={component.userComponentId} className="block">
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{component.name}</CardTitle>
                  <CardDescription>{component.brand} {component.model}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ComponentStatusList components={[component]} />
                </CardContent>
                <div className="p-4 pt-0 text-right">
                    <Button variant="link" className="p-0 h-auto">View Details <ArrowUpRight className="ml-1 h-4 w-4" /></Button>
                </div>
              </Card>
            </Link>
          ))}
           {systemComponents.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed rounded-lg col-span-full">
                    <h3 className="text-lg font-semibold">No Components</h3>
                    <p className="text-muted-foreground">Add a component to this system using the button above.</p>
                </div>
           )}
        </CardContent>
      </Card>
    </>
  );
}
