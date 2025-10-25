'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { checkStravaConnection } from '@/app/(app)/settings/apps/actions';

export function StravaConnectionCard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkConnection = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const idToken = await user.getIdToken(true);
            const { connected } = await checkStravaConnection(idToken);
            setIsConnected(connected);
        } catch (error) {
            console.error("Failed to check Strava connection:", error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            checkConnection();
        }
    }, [authLoading, checkConnection]);

    const handleNavigation = () => {
        router.push('/settings/apps');
    };
    
    const CardButton = () => {
        if (isLoading || authLoading) {
            return (
                 <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Connection...
                </Button>
            )
        }
        
        if (isConnected) {
            return (
                 <Button onClick={handleNavigation} className="w-full">
                    View Recent Rides
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )
        }
        
        return (
             <Button onClick={handleNavigation} className="w-full">
                Connect to Strava
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        )
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Strava Integration</CardTitle>
                <CardDescription>
                    {isConnected ? "View your recent activities to update component wear." : "Connect your Strava account to automatically track your rides."}
                </CardDescription>
            </CardHeader>
            <CardContent>
               <CardButton />
            </CardContent>
        </Card>
    )

}
