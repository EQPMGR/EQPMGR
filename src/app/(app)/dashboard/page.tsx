
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StravaConnectionCard } from '@/components/strava-connection-card';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
        <Card className="max-w-md">
          <CardHeader>
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null; // Should not happen in this layout, but good practice
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="max-w-md">
        <CardHeader>
            <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-lg font-medium">{user.displayName || 'User'}</p>
        </CardContent>
        </Card>
        <StravaConnectionCard />
    </div>
  );
}
