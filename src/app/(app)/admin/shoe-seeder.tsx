
'use client';

import { useState } from 'react';
import { Database, Loader2, Footprints } from 'lucide-react';
import { writeBatch, doc, collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { SHOE_COMPONENTS } from '@/lib/shoes-data';

const createComponentId = (component: any) => {
    const idString = [component.brand, component.model]
        .filter(Boolean)
        .join('-');
    
    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

async function seedShoeComponents() {
    const batch = writeBatch(db);
    const masterComponentsRef = collection(db, 'masterComponents');
    let count = 0;

    for (const component of SHOE_COMPONENTS) {
        const masterId = createComponentId(component);
        if (masterId) {
            const docRef = doc(masterComponentsRef, masterId);
            batch.set(docRef, component, { merge: true });
            count++;
        }
    }

    if (count === 0) {
        return { success: true, message: "No new shoes to seed." }
    }

    await batch.commit();

    return { success: true, message: `Successfully seeded ${count} shoes.` };
}

export function ShoeSeeder() {
    const [isSeeding, setIsSeeding] = useState(false);
    const { toast } = useToast();

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedShoeComponents();
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
                    <CardTitle className="text-base font-semibold">Seed Shoe Database</CardTitle>
                    <CardDescription className="text-sm">
                        Populate the database with common cycling shoes.
                    </CardDescription>
                </div>
                <Button onClick={handleSeed} disabled={isSeeding} size="sm" variant="outline">
                    {isSeeding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Footprints className="h-4 w-4 mr-2" />
                    )}
                    Seed Shoes
                </Button>
            </CardHeader>
        </Card>
    );
}
