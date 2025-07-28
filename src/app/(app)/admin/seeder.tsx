
'use client';

import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { writeBatch, doc, collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { BASE_COMPONENTS } from '@/lib/constants';

const createComponentId = (component: any) => {
    // A more robust ID based on Brand, Name, and Model.
    // Base components might only have a name.
    const idString = [component.brand, component.name, component.model]
        .filter(Boolean) // Remove empty strings
        .join('-');
    
    // If we only have a name (like 'Frame'), use that.
    if (!idString && component.name) {
        return component.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

async function seedMasterComponents() {
    const batch = writeBatch(db);
    const masterComponentsRef = collection(db, 'masterComponents');
    let count = 0;

    for (const component of BASE_COMPONENTS) {
        // We want to seed all base components, even if they only have a name and system.
        // The check was too restrictive before.
        const masterId = createComponentId(component);
        if (masterId) {
            const docRef = doc(masterComponentsRef, masterId);
            const componentToSave: { [key: string]: any } = {};
            
            // Only add fields that have a non-empty value
            Object.keys(component).forEach((key) => {
                const typedKey = key as keyof typeof component;
                if (component[typedKey]) {
                    componentToSave[key] = component[typedKey];
                }
            });

            batch.set(docRef, componentToSave, { merge: true });
            count++;
        }
    }

    if (count === 0) {
        return { success: true, message: "No new base components to seed." }
    }

    await batch.commit();

    return { success: true, message: `Successfully seeded ${count} base components.` };
}


export function AdminSeeder() {
    const [isSeeding, setIsSeeding] = useState(false);
    const { toast } = useToast();

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedMasterComponents();
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
                    <CardTitle className="text-base font-semibold">Seed Database</CardTitle>
                    <CardDescription className="text-sm">
                        Populate the database with base components. Run this once.
                    </CardDescription>
                </div>
                <Button onClick={handleSeed} disabled={isSeeding} size="sm" variant="outline">
                    {isSeeding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Database className="h-4 w-4 mr-2" />
                    )}
                    Seed Components
                </Button>
            </CardHeader>
        </Card>
    );
}
