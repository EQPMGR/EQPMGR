
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ArrowUpRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { toDate, toNullableDate } from '@/lib/date-utils';
import type { Equipment, Component } from '@/lib/types';
import { ComponentStatusList } from '@/components/component-status-list';

export default function SystemDetailPage() {
  const params = useParams<{ id: string; system: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const systemName = useMemo(() => {
    if (!params.system) return '';
    // Convert slug back to title case for display
    return params.system.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [params.system]);

  useEffect(() => {
    if (user && params.id) {
      const fetchEquipment = async () => {
        setIsLoading(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const equipmentData = userData.equipment?.[params.id];

            if (equipmentData) {
              const components = (equipmentData.components || []).map((c: any) => ({
                ...c,
                purchaseDate: toDate(c.purchaseDate),
                lastServiceDate: toNullableDate(c.lastServiceDate),
              }));
              const maintenanceLog = (equipmentData.maintenanceLog || []).map((l: any) => ({
                ...l,
                date: toDate(l.date),
              }));

              setEquipment({
                ...equipmentData,
                id: params.id,
                purchaseDate: toDate(equipmentData.purchaseDate),
                components,
                maintenanceLog,
              } as Equipment);
            } else {
               toast({
                variant: "destructive",
                title: "Not Found",
                description: "Could not find the requested equipment."
              });
              setEquipment(undefined);
            }
          }
        } catch (error) {
          console.error("Error fetching equipment details: ", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load equipment details."
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchEquipment();
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, params.id, authLoading, toast]);

  const systemComponents = useMemo(() => {
    if (!equipment) return [];
    return equipment.components.filter(c => c.system.toLowerCase().replace(/\s+/g, '-') === params.system);
  }, [equipment, params.system]);
  
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
      <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" asChild>
              <Link href={`/equipment/${params.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                  Back to {equipment.name}
              </Link>
          </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">{systemName} Components</CardTitle>
          <CardDescription>Details for each component in the {systemName.toLowerCase()} system.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemComponents.map(component => (
            <Link href={`/equipment/${params.id}/${params.system}/${component.id}`} key={component.id} className="block">
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
        </CardContent>
      </Card>
    </>
  );
}
