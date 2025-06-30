
import type { Metadata } from 'next';
import { SettingsNav } from '@/components/settings-nav';

export const metadata: Metadata = {
  title: 'Settings - TrailPulse',
  description: 'Manage your account settings.',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold font-headline">Settings</h1>
        </div>
        <div className="grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <SettingsNav />
          <div className="grid gap-6">
            {children}
          </div>
        </div>
      </div>
  );
}
