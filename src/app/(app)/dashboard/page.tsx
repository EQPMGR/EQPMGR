'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StravaConnectionCard } from '@/components/strava-connection-card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Open Work Orders</CardTitle>
              <CardDescription>
                A summary of your equipment currently being serviced.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold">No Open Work Orders</h3>
                <p className="text-muted-foreground">When you request service, it will appear here.</p>
              </div>
            </CardContent>
          </Card>
          <StravaConnectionCard />
      </div>
    </div>
  );
}
