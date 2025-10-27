
import { StravaConnectionCard } from '@/components/strava-connection-card';
import { OpenWorkOrders } from '@/components/open-work-orders';
import { ComponentHotspot } from '@/components/component-hotspot';
import { InsuranceCard } from '@/components/insurance-card';

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ComponentHotspot />
        <StravaConnectionCard />
        <OpenWorkOrders />
        <InsuranceCard />
    </div>
  );
}
