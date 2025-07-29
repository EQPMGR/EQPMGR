'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowUpRight, DatabaseZap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { AdminSeeder } from './seeder';
import { ShimanoSeeder } from './shimano-seeder';
import { SramSeeder } from './sram-seeder';

export default function AdminPage() {
    const { user } = useAuth();

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
                <AdminSeeder />
                <ShimanoSeeder />
                <SramSeeder />
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Firestore Vector Indexing</CardTitle>
                            <CardDescription className="text-sm">
                                Generate embeddings for component search.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/vector-admin">
                                <DatabaseZap className="h-4 w-4 mr-2" /> Manage Embeddings
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
            </CardContent>
        </Card>
    );
}
