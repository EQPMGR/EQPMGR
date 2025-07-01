import AppLayout from "./(app)/layout";
import { DashboardPage } from '@/components/dashboard-page';

export default function Home() {
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}
