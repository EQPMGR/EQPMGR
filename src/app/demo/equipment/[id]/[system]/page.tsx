
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ArrowUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ComponentStatusList } from '@/components/component-status-list';
import { demoEquipment } from '@/lib/demo-data';

export default function DemoSystemDetailPage() {
  const params = useParams<{ id: string; system: string }>();
  const equipment = demoEquipment.find(e => e.id === params.id);

  const systemName = useMemo(() => {
    if (!params.system) return '';
    return params.system.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [params.system]);

  const systemComponents = useMemo(() => {
    if (!equipment?.components) return [];
    const systemSlug = params.system.replace(/-/g, ' ').toLowerCase();
    return equipment.components.filter(c => c.system.toLowerCase() === systemSlug);
  }, [equipment, params.system]);
  
  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Equipment not found</h1>
          <Button asChild variant="link">
            <Link href="/demo/equipment">Go back to Demo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" asChild>
              <Link href={`/demo/equipment/${params.id}`}>
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
            <Link href={`/demo/equipment/${params.id}/${params.system}/${component.userComponentId}`} key={component.userComponentId} className="block">
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
