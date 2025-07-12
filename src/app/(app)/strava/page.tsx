
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StravaPage() {
    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Connect to Strava</CardTitle>
                <CardDescription>
                    Authorize EQPMGR to access your Strava data to automatically track equipment usage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4">Click the button below to be redirected to Strava to approve the connection. You will be returned to the settings page after.</p>
                <Button asChild>
                    <Link href="/api/strava/connect">Connect with Strava</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
