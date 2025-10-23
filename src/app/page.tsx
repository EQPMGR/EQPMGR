import AppLayout from "./(app)/layout";
import DashboardPage from "@/app/(app)/dashboard/page";

export default function Home() {
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}
