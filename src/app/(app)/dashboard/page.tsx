
import { StravaConnectionCard } from '@/components/strava-connection-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { OpenWorkOrders } from '@/components/open-work-orders';

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
        <OpenWorkOrders />
    </div>
  );
}
