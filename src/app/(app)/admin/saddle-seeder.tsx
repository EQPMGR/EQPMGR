
'use client';

import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getDb } from '@/backend';
import { SADDLE_COMPONENTS } from '@/lib/saddles-data';

const createComponentId = (component: any) => {
    const idString = [component.brand, component.model, component.size]
        .filter(Boolean)
        .join('-');
    
    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

async function seedSaddleComponents() {
    const database = await getDb();
    const batch = database.batch();
    let count = 0;

    for (const component of SADDLE_COMPONENTS) {
        const masterId = createComponentId(component);
        if (masterId) {
            batch.set('masterComponents', masterId, component, { merge: true });
            count++;
        }
    }

    if (count === 0) {
        return { success: true, message: "No new saddles to seed." }
    }

    await batch.commit();

    return { success: true, message: `Successfully seeded ${count} saddles.` };
}

export function SaddleSeeder() {
    const [isSeeding, setIsSeeding] = useState(false);
    const { toast } = useToast();

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedSaddleComponents();
            if (result.success) {
                toast({
                    title: 'Database Seeding',
                    description: result.message,
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Seeding Failed',
                    description: result.message,
                });
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Seeding Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-base font-semibold">Seed Saddle Database</CardTitle>
                    <CardDescription className="text-sm">
                        Populate the database with common saddles.
                    </CardDescription>
                </div>
                <Button onClick={handleSeed} disabled={isSeeding} size="sm" variant="outline">
                    {isSeeding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Database className="h-4 w-4 mr-2" />
                    )}
                    Seed Saddles
                </Button>
            </CardHeader>
        </Card>
    );
}
