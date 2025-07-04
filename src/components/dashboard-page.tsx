'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.displayName || 'gearhead'}! Here's a quick overview.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Your main hub for everything gear-related.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Use the navigation menu to view your equipment, add new gear, and manage your settings.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Strava Integration</CardTitle>
            <CardDescription>
              Connect your Strava account to automatically track usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Coming soon! Auto-import your activities to simulate wear and tear.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
