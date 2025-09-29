
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StravaConnectButton } from '@/components/strava-connect-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/use-auth';
import { exchangeStravaToken } from './actions';
import { useToast } from '@/hooks/use-toast';

function AppsSettings() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Strava Connection Failed',
        description: `Strava returned an error: ${error}`,
      });
      // Clean the URL
      router.replace('/settings/apps');
    } else if (code) {
      setIsExchanging(true);
      exchangeStravaToken(code)
        .then((result) => {
          if (result.success) {
            toast({
              title: 'Strava Connected!',
              description: 'Your account has been successfully linked.',
            });
          } else {
            throw new Error(result.error);
          }
        })
        .catch((err) => {
          console.error('Token exchange failed:', err);
          toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: err.message || 'An unknown error occurred during token exchange.',
          });
        })
        .finally(() => {
          setIsExchanging(false);
          // Clean the URL after processing
          router.replace('/settings/apps');
        });
    }
  }, [searchParams, router, toast]);

  const handleStravaConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    // IMPORTANT: Redirect back to this page
    const redirectUri = `${window.location.origin}/settings/apps`;

    if (!clientId) {
      console.error('Strava Client ID is not configured.');
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Strava integration is not configured correctly.',
      });
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
          
          {loading || isExchanging ? (
             <div className="text-sm font-medium text-muted-foreground flex items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {isExchanging ? 'Connecting...' : 'Loading...'}
            </div>
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

// Wrap with Suspense because useSearchParams() requires it.
export default function AppsSettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <AppsSettings />
    </Suspense>
  );
}
