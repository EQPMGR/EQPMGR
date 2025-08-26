
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

function TokenExchanger() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const scope = searchParams.get('scope');

    if (!user) {
        // Wait for user to be available
        return;
    }

    if (code) {
        fetch('/api/strava/token-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        })
        .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error || 'Token exchange failed') }))
        .then(async () => {
            // The token exchange happens server-side. Here we just confirm it worked.
            toast({ title: 'Strava Connected!', description: 'Your account has been successfully linked.' });
            setStatus('success');
            // We can optionally close this window if it was a popup
            // setTimeout(() => window.close(), 1000);
        })
        .catch((err) => {
            setErrorMessage(err.message || "An unknown error occurred during token exchange.");
            setStatus('error');
            toast({ variant: 'destructive', title: 'Connection Failed', description: err.message });
        });
    } else {
        setErrorMessage("No authorization code found in the URL. Please try connecting again.");
        setStatus('error');
    }
  }, [user, searchParams, router, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connecting to Strava</CardTitle>
          <CardDescription>
            {status === 'exchanging' && 'Please wait, exchanging authorization code for a token...'}
            {status === 'success' && 'Successfully connected! You can now close this tab.'}
            {status === 'error' && 'There was a problem connecting your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          {status === 'exchanging' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
          {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
        </CardContent>
        {status !== 'exchanging' && (
          <CardFooter className="flex flex-col gap-4">
             {status === 'error' && (
              <p className="text-sm text-destructive text-center">{errorMessage}</p>
            )}
            <Button onClick={() => window.close()} className="w-full">
              Close
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function ExchangeTokenPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin"/></div>}>
            <TokenExchanger />
        </Suspense>
    );
}
