
import { Suspense } from 'react';
import { StravaConnectionCard } from '@/components/strava-connection-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchOpenWorkOrders } from './actions';
import { OpenWorkOrders } from '@/components/open-work-orders';
import { Skeleton } from '@/components/ui/skeleton';

async function WorkOrders() {
  const initialWorkOrders = await fetchOpenWorkOrders();
  return <OpenWorkOrders initialWorkOrders={initialWorkOrders} />;
}

export default function DashboardPage() {

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
              <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-lg font-medium">Dashboard</p>
          </CardContent>
        </Card>
        <StravaConnectionCard />
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <WorkOrders />
        </Suspense>
    </div>
  );
}
