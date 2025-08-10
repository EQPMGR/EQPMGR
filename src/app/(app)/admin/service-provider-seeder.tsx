
'use client';

import { useState } from 'react';
import { Database, Loader2, Building } from 'lucide-react';
import { writeBatch, doc, collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { SERVICE_PROVIDERS_DATA } from '@/lib/service-providers-data';

// A simple slug generator for the document ID
const createProviderId = (provider: any) => {
    return `${provider.name}-${provider.city}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

async function seedServiceProviders() {
    const batch = writeBatch(db);
    const providersRef = collection(db, 'serviceProviders');
    let count = 0;

    for (const provider of SERVICE_PROVIDERS_DATA) {
        const providerId = createProviderId(provider);
        if (providerId) {
            const docRef = doc(providersRef, providerId);
            batch.set(docRef, provider);
            count++;
        }
    }

    if (count === 0) {
        return { success: true, message: "No new service providers to seed." }
    }

    await batch.commit();

    return { success: true, message: `Successfully seeded ${count} service providers.` };
}


export function ServiceProviderSeeder() {
    const [isSeeding, setIsSeeding] = useState(false);
    const { toast } = useToast();

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedServiceProviders();
            toast({
                title: 'Database Seeding',
                description: result.message,
            });
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
                    <CardTitle className="text-base font-semibold">Seed Service Providers</CardTitle>
                    <CardDescription className="text-sm">
                        Add initial service provider partners to the database.
                    </CardDescription>
                </div>
                <Button onClick={handleSeed} disabled={isSeeding} size="sm" variant="outline">
                    {isSeeding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Building className="h-4 w-4 mr-2" />
                    )}
                    Seed Providers
                </Button>
            </CardHeader>
        </Card>
    );
}
