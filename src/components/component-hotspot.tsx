
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getDb } from '@/backend';
import type { Equipment, Component, MasterComponent, UserComponent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';
import { ComponentStatusList } from './component-status-list';
import { toDate, toNullableDate } from '@/lib/date-utils';

interface HotspotComponent extends Component {
  equipmentName: string;
  equipmentId: string;
}

export function ComponentHotspot() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);

  const fetchAllEquipmentData = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const database = await getDb();
      let querySnapshot = await database.getDocs<Equipment>(
        'equipment',
        { type: 'where', field: 'userId', op: '==', value: uid }
      );

      if (querySnapshot.empty) {
        querySnapshot = await database.getDocs<Equipment>(
          'equipment',
          { type: 'where', field: 'appUserId', op: '==', value: uid }
        );
      }

      const equipmentPromises = querySnapshot.docs.map(async (doc) => {
        const equipmentData = doc.data;
        const componentsSnapshot = await database.getDocs<UserComponent>(
          'components',
          { type: 'where', field: 'equipmentId', op: '==', value: doc.id }
        );

        const userComponents: UserComponent[] = componentsSnapshot.docs.map(compDoc => ({ id: compDoc.id, ...compDoc.data } as UserComponent));

        const masterComponentIds = [...new Set(userComponents.map(c => c.masterComponentId).filter(Boolean))];
        const masterComponentsMap = new Map<string, MasterComponent>();

        if (masterComponentIds.length > 0) {
          for (let i = 0; i < masterComponentIds.length; i += 30) {
            const batchIds = masterComponentIds.slice(i, i + 30);
            if (batchIds.length > 0) {
              const masterQuerySnapshot = await database.getDocs<MasterComponent>(
                'masterComponents',
                { type: 'where', field: 'id', op: 'in', value: batchIds }
              );
              masterQuerySnapshot.docs.forEach(masterDoc => {
                masterComponentsMap.set(masterDoc.id, { id: masterDoc.id, ...masterDoc.data } as MasterComponent);
              });
            }
          }
        }

        const components: Component[] = userComponents.map(userComp => {
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

        return {
          id: doc.id,
          ...equipmentData,
          components,
        } as Equipment;
      });

      const allEq = await Promise.all(equipmentPromises);
      setAllEquipment(allEq);

    } catch (error) {
        console.error("Error fetching equipment for hotspot:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllEquipmentData(user.uid);
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, authLoading, fetchAllEquipmentData]);

  const hasEquipment = allEquipment.length > 0;

  const mostWornComponent = useMemo(() => {
    if (!hasEquipment) return null;

    let mostWorn: HotspotComponent | null = null;

    allEquipment.forEach(equipment => {
      equipment.components.forEach(component => {
        if (!mostWorn || component.wearPercentage > mostWorn.wearPercentage) {
          mostWorn = {
            ...component,
            equipmentId: equipment.id,
            equipmentName: equipment.name,
          };
        }
      });
    });

    return mostWorn;
  }, [allEquipment, hasEquipment]);
  
  const systemSlug = mostWornComponent?.system.toLowerCase().replace(/\s+/g, '-') || '';

  if (isLoading || authLoading) {
    return <Skeleton className="h-full min-h-[160px]" />;
  }

  if (!hasEquipment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle /> Add Your First Bike
          </CardTitle>
          <CardDescription>Start building your equipment inventory and unlock component wear tracking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your component hotspot will appear once you add a bike.</p>
          <Button asChild>
            <Link href="/equipment">Add Your First Bike</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!mostWornComponent) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle /> Component Hotspot
                </CardTitle>
                <CardDescription>The most worn part in your inventory.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-4">Add equipment to start tracking wear.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Link href={`/equipment/${mostWornComponent.equipmentId}/${systemSlug}`}>
        <Card className="h-full hover:bg-muted/50 transition-colors">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <AlertCircle className="text-destructive" /> Component Hotspot
                </CardTitle>
                <CardDescription>The most worn part across all your gear.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-medium text-muted-foreground">{mostWornComponent.equipmentName}</p>
                <ComponentStatusList components={[mostWornComponent]} />
            </CardContent>
        </Card>
    </Link>
  );
}
