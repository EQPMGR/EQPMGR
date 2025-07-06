'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { bikeDatabase, type BikeFromDB, type BikeComponentFromDB } from '@/lib/bike-database';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { ArrowUpRight, Bike, Loader2 } from 'lucide-react';
import Link from 'next/link';

// A simple utility to create a slug from a component's details
const createComponentId = (component: BikeComponentFromDB) => {
    return `${component.brand}-${component.model}-${component.name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const createBikeModelId = (bike: BikeFromDB) => {
    return `${bike.brand}-${bike.model}-${bike.modelYear}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export default function AdminPage() {
    const [isMigrating, setIsMigrating] = useState(false);
    const { toast } = useToast();

    const handleMigrate = async () => {
        setIsMigrating(true);
        toast({ title: "Starting migration...", description: "This may take a moment." });

        try {
            const batch = writeBatch(db);
            const masterComponentsRef = collection(db, 'masterComponents');
            const bikeModelsRef = collection(db, 'bikeModels');
            
            const addedComponentIds = new Set<string>();

            for (const bike of bikeDatabase) {
                const componentReferences: string[] = [];

                // Process all components for the current bike
                for (const component of bike.components) {
                    const componentId = createComponentId(component);
                    
                    // Add component to master list if it hasn't been added in this batch yet
                    if (!addedComponentIds.has(componentId)) {
                        const masterComponentDocRef = doc(masterComponentsRef, componentId);
                        batch.set(masterComponentDocRef, component);
                        addedComponentIds.add(componentId);
                    }
                    // Use the full path for the reference
                    componentReferences.push(doc(masterComponentsRef, componentId).path);
                }

                // Create the bike model document
                const bikeModelId = createBikeModelId(bike);
                const bikeModelDocRef = doc(bikeModelsRef, bikeModelId);
                
                // Exclude components from the bike model data before setting it
                const { components, ...bikeModelData } = bike;

                batch.set(bikeModelDocRef, {
                    ...bikeModelData,
                    components: componentReferences,
                });
            }

            // Commit the batch
            await batch.commit();

            toast({
                title: 'Migration Successful!',
                description: `${bikeDatabase.length} bike models and ${addedComponentIds.size} master components have been migrated.`,
            });

        } catch (error: any) {
            console.error("Migration failed:", error);
            toast({
                variant: 'destructive',
                title: 'Migration Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>Admin Utilities</CardTitle>
                <CardDescription>Tools to manage the application database and content.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-base font-semibold">Migrate Bike Catalog</CardTitle>
                            <CardDescription className="text-sm">
                                Moves hardcoded bike data into Firestore collections.
                            </CardDescription>
                        </div>
                         <Button onClick={handleMigrate} disabled={isMigrating} size="sm">
                            {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Migrate Data
                        </Button>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Add New Bike Model</CardTitle>
                            <CardDescription className="text-sm">
                                Manually add a new bike model to the database.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/add-bike-model">
                                Go to Form <ArrowUpRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
            </CardContent>
        </Card>
    );
}
