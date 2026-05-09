
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

export function InsuranceQuoteButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLocationFallback = async (errorMessage: string) => {
    try {
      const fallbackResponse = await fetch('/api/geocode-ip');
      const fallbackData = await fallbackResponse.json().catch(() => ({ province: null, warning: 'Fallback service did not respond.' }));

      if (fallbackData.province === 'British Columbia') {
        toast({
          title: 'Service Available!',
          description: 'Could not obtain GPS location, but IP-based location indicates British Columbia. Redirecting...',
        });
        router.push('/insurance');
        setIsLoading(false);
        return;
      }

      // If no province or not BC, allow user to proceed manually with clear guidance
      toast({
        variant: 'warning',
        title: 'Location not determined',
        description: `${errorMessage} IP fallback yielded ${fallbackData.province || 'unknown location'}. You can still continue the application manually.`,
        duration: 9000,
      });

      router.push('/insurance');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Location Error',
        description: `${errorMessage} Fallback process failed: ${err.message || 'unknown error'}. You can still continue manually at the insurance page.`,
        duration: 9000,
      });
      router.push('/insurance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetQuote = () => {
    setIsLoading(true);

    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support location services.',
      });
      setIsLoading(false);
      return;
    }

    // One-shot attempt with a short timeout to avoid long spinner waits.
    const attemptGeolocation = (timeoutMs = 7000): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        });
      });
    };

    const processGeoResults = async (province: string | null, warn?: string) => {
      if (province === 'British Columbia') {
        toast({ title: 'Service Available!', description: 'You are in BC. Redirecting to insurance application.' });
        router.push('/insurance');
      } else if (province) {
        toast({
          variant: 'default',
          title: 'Coverage Not Available',
          description: `We currently only cover BC. Your region is ${province}. We'll notify local brokers as available.`,
          duration: 9000,
        });
        router.push('/insurance?brokerInterest=1');
      } else {
        toast({
          variant: 'warning',
          title: 'Location Unknown',
          description: warn || 'Could not determine exact province. Coverage is currently BC-only.',
          duration: 9000,
        });
        router.push('/insurance?brokerInterest=1');
      }
      setIsLoading(false);
    };

    const processPosition = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
        const data = await response.json().catch(() => ({ province: null, warning: 'Unable to parse geocoding response.' }));
        await processGeoResults(data.province, data.warning);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Location Error', description: error.message || 'Unable to resolve province.' });
        setIsLoading(false);
      }
    };

    const onGeolocationFailure = async (error: GeolocationPositionError | Error) => {
      if ('code' in error && error.code === error.PERMISSION_DENIED) {
        toast({ variant: 'destructive', title: 'Location Permission Denied', description: 'Location access is blocked. You can continue the insurance application manually.' });
        router.push('/insurance?brokerInterest=1');
        setIsLoading(false);
        return;
      }

      // For timeout/unavailable, use IP fallback straight away (faster flow) and no long waiting.
      try {
        const fallbackResponse = await fetch('/api/geocode-ip');
        const fallbackData = await fallbackResponse.json().catch(() => ({ province: null, warning: 'Fallback service did not respond.' }));
        await processGeoResults(fallbackData.province, fallbackData.warning || 'GPS location failed.');
      } catch (fallbackError: any) {
        toast({ variant: 'warning', title: 'Location Unavailable', description: 'Unable to derive location automatically. You can still continue manually on the insurance page.' });
        router.push('/insurance?brokerInterest=1');
        setIsLoading(false);
      }
    };

    attemptGeolocation(7000)
      .then(processPosition)
      .catch(onGeolocationFailure);
  };

  return (
    <Button onClick={handleGetQuote} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 animate-spin" />
      ) : (
        <Shield className="mr-2" />
      )}
      Get Insurance Quote
    </Button>
  );
}
