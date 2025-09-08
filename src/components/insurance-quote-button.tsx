
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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to determine location.');
          }
          const data = await response.json();
          
          if (data.province === 'British Columbia') {
            toast({
              title: 'Service Available!',
              description: 'Redirecting you to the insurance application for British Columbia.',
            });
            router.push('/insurance');
          } else {
            toast({
              variant: 'default',
              title: 'Coming Soon!',
              description: `Insurance services are not yet available in ${data.province || 'your area'}. We're expanding soon!`,
              duration: 7000,
            });
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Location Error', description: error.message });
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        toast({ variant: 'destructive', title: 'Location Access Denied', description: 'Please enable location services to check for insurance availability.' });
        setIsLoading(false);
      }
    );
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
