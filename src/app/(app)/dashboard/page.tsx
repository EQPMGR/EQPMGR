'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StravaConnectButton } from '@/components/strava-connect-button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { checkStravaConnection } from '@/app/(app)/settings/apps/actions';
import Cookies from 'js-cookie';
import { StravaDashboardWrapper } from '@/components/strava-dashboard-wrapper';


function StravaDashboard() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check actual Strava connection from backend
  useEffect(() => {
    if (!user || loading) return;

    setCheckingConnection(true);
    user.getIdToken()
      .then(idToken => checkStravaConnection(idToken))
      .then(result => {
        setIsStravaConnected(result.connected);
        if (result.connected) {
          const justConnected = searchParams.get('strava_connected') === 'true';
          if(justConnected) {
             toast({ title: 'Strava Connected!', description: 'Your account has been successfully linked.' });
             router.replace('/dashboard', { scroll: false });
          }
        }
      })
      .catch(() => {
        setIsStravaConnected(false);
      })
      .finally(() => {
        setCheckingConnection(false);
      });
  }, [user, loading, searchParams, router, toast]);


  const handleStravaConnect = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to connect to Strava.',
      });
      return;
    }
    setIsConnecting(true);

    try {
        const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
        const redirectUri = `${window.location.origin}/api/strava/token-exchange`;

        const idToken = await user.getIdToken();
        Cookies.set('strava_id_token', idToken, { expires: 1/144, secure: true, sameSite: 'Lax' }); // Expires in 10 minutes

        if (!clientId) {
          throw new Error('Strava Client ID is not configured.');
        }
        
        const state = crypto.randomUUID();
        sessionStorage.setItem('strava_oauth_state', state);
        sessionStorage.setItem('strava_redirect_path', '/dashboard');

        const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&approval_prompt=force&scope=read,activity:read_all&state=${state}`;

        window.location.href = stravaAuthUrl;

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Connection Error', description: error.message });
        setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>App Integrations</CardTitle>
          <CardDescription>
            Connect your accounts from other services to sync your activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">Strava</h4>
            
            {loading || isConnecting || checkingConnection ? (
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isConnecting ? 'Connecting...' : checkingConnection ? 'Checking connection...' : 'Loading...'}
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
        </CardContent>
      </Card>
      
      {isStravaConnected && (
        <StravaDashboardWrapper />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StravaDashboard />
    </Suspense>
  );
}
