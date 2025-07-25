
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ComponentStatusList } from '@/components/component-status-list';
import { demoEquipment } from '@/lib/demo-data';

export default function DemoComponentDetailPage() {
  const params = useParams<{ id: string; system: string; componentId: string }>();
  
  const equipment = demoEquipment.find(e => e.id === params.id);
  const component = equipment?.components.find(c => c.userComponentId === params.componentId);

  if (!component) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Component not found</h1>
        <Button asChild variant="link">
            <Link href={`/demo/equipment/${params.id}`}>Go back to Equipment</Link>
        </Button>
      </div>
    );
  }

  return (
     <>
      <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" asChild>
              <Link href={`/demo/equipment/${params.id}/${params.system}`}>
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

             <div className="mt-6 border-t pt-6">
                <h4 className="font-semibold mb-2">Actions</h4>
                <div className="flex gap-2">
                    <Button disabled>
                      Replace Part
                    </Button>
                    <Button variant="secondary" disabled>Log Maintenance</Button>
                </div>
             </div>
        </CardContent>
      </Card>
     </>
  );
}

