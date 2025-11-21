
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getDb } from '@/backend';
import type { Equipment, Component, MasterComponent, UserComponent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
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
      const querySnapshot = await database.getDocsFromSubcollection<Equipment>(`app_users/${uid}`, 'equipment');

      const equipmentPromises = querySnapshot.docs.map(async (doc) => {
        const equipmentData = doc.data;
        const componentsSnapshot = await database.getDocsFromSubcollection<UserComponent>(
          `app_users/${uid}/equipment/${doc.id}`,
          'components'
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
                { type: 'where', field: '__name__', op: 'in', value: batchIds }
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

  const mostWornComponent = useMemo(() => {
    if (allEquipment.length === 0) return null;

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
  }, [allEquipment]);
  
  const systemSlug = mostWornComponent?.system.toLowerCase().replace(/\s+/g, '-') || '';

  if (isLoading || authLoading) {
    return <Skeleton className="h-full min-h-[160px]" />;
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
