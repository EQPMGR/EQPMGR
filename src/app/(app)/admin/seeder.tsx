
'use client';

import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedMasterComponents } from './actions';

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
