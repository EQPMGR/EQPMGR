
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowUpRight, SearchCheck, FileInput, Building, Trash2, Database, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { StravaWebhookCard } from '@/components/strava-webhook-card';

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
                            <CardTitle className="text-base font-semibold">Database Seeders</CardTitle>
                            <CardDescription className="text-sm">
                                Populate master component databases (Shimano, SRAM, headsets, etc.)
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/seeders">
                                <Database className="h-4 w-4 mr-2" /> Seed
                            </Link>
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
                            <Link href="/add-bike-model">
                                Go to Form <ArrowUpRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
                 <StravaWebhookCard />
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Field Data</CardTitle>
                            <CardDescription className="text-sm">
                                Learned lifespans, chain stretch reports and ride weather stats.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/field-data">
                                <BarChart3 className="h-4 w-4 mr-2" /> View
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Import Feedback Analyzer</CardTitle>
                            <CardDescription className="text-sm">
                                Review parsed vs final import feedback and common parser mistakes.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/import-feedback">
                                <BarChart3 className="h-4 w-4 mr-2" /> Review
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Add Service Provider</CardTitle>
                            <CardDescription className="text-sm">
                                Onboard a new service provider or partner.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/add-service-provider">
                                <Building className="h-4 w-4 mr-2" /> Add Provider
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Data Quality Tools</CardTitle>
                            <CardDescription className="text-sm">
                                Find and reconcile potential duplicate components.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/find-duplicates">
                                <SearchCheck className="h-4 w-4 mr-2" /> Review Duplicates
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div>
                            <CardTitle className="text-base font-semibold">Database Cleanup</CardTitle>
                            <CardDescription className="text-sm">
                                Run scripts to clean up or migrate data.
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/data-cleanup">
                                <Trash2 className="h-4 w-4 mr-2" /> Data Tools
                            </Link>
                        </Button>
                    </CardHeader>
                </Card>
            </CardContent>
        </Card>
    );
}
