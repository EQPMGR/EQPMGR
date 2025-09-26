'use client';

import React from 'react';
import { StravaConnectButton } from '@/components/strava-connect-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/use-auth'; // Use your existing use-auth hook

function AppsSettingsPage() {
  const { user } = useAuth(); // Your existing hook provides the user object
  const { profile, loading } = useUserProfile(user?.uid); // Pass the user's ID to the new hook

  const handleStravaConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = `${window.location.origin}/exchange-token`;

    if (!clientId) {
      console.error('Strava Client ID is not configured.');
      alert('Strava integration is not configured correctly.');
      return;
    }

    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&approval_prompt=force&scope=read,activity:read_all`;

    window.location.href = stravaAuthUrl;
  };
  
  const isStravaConnected = !loading && profile?.strava?.accessToken;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">App Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect your accounts from other services to sync your activities.
        </p>
      </div>
      <div className="border-t border-gray-200"></div>
      <div className="space-y-4">
        <h4 className="text-md font-medium">Strava</h4>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Connect your Strava account to automatically import your rides.
          </p>
          
          {loading ? (
            <p className="text-sm animate-pulse">Loading status...</p>
          ) : isStravaConnected ? (
            <div className="text-sm font-medium text-green-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected
            </div>
          ) : (
            <StravaConnectButton onClick={handleStravaConnect} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AppsSettingsPage;