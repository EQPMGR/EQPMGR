
import { StravaConnectionCard } from '@/components/strava-connection-card';
import { ComponentHotspot } from '@/components/component-hotspot';
import { InsuranceCard } from '@/components/insurance-card';
import { OpenWorkOrders } from '@/components/open-work-orders';
import { GettingStartedCard } from '@/components/getting-started-card';

import { PageContainer } from '@/components/page-container';

export default function DashboardPage() {
  return (
    <PageContainer>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <GettingStartedCard />
        <OpenWorkOrders />
        <ComponentHotspot />
        <StravaConnectionCard />
        <InsuranceCard />
      </div>
    </PageContainer>
  );
}
