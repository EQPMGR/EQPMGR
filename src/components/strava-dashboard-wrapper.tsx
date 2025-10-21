import { RecentActivities } from '@/components/recent-activities';

// This is a Server Component, even though it renders a Client Component.
// Its job is to provide a clean, isolated boundary for the Strava card
// ensuring it renders independently from the main dashboard client logic.
export function StravaDashboardWrapper() {
    // We intentionally do not use 'use client' here.
    return <RecentActivities showTitle={true} />;
}
