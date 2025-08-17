

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getServiceProviders } from './actions';
import type { ServiceProvider } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Globe, Phone, Building, LocateFixed } from 'lucide-react';
import { getDistanceFromLatLonInKm } from '@/lib/geo-utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormItem } from '@/components/ui/form';

interface ServiceProviderWithDistance extends ServiceProvider {
  distance?: number;
}

function ServiceProviderCard({ provider }: { provider: ServiceProviderWithDistance }) {
  return (
    <Card>
      <CardHeader>
        {provider.logoUrl ? (
          <div className="relative h-24 w-full mb-4">
            <Image
              src={provider.logoUrl}
              alt={`${provider.shopName || provider.name} logo`}
              fill
              objectFit="contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 w-full mb-4 bg-muted rounded-md">
            <Building className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <CardTitle className="font-headline">{provider.shopName || provider.name}</CardTitle>
        <CardDescription>
          {provider.address}, {provider.city}
          {provider.distance !== undefined && (
            <span className="block font-semibold text-primary">{provider.distance.toFixed(1)} km away</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
            {provider.services.map(service => (
                <Badge key={service} variant="secondary">
                    {service.replace('-', ' ')}
                </Badge>
            ))}
        </div>
        <div className="flex items-center gap-4 text-sm">
            {provider.website && (
                <Button variant="ghost" size="sm" asChild>
                    <a href={provider.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="mr-2 h-4 w-4" />
                        Website
                    </a>
                </Button>
            )}
            {provider.phone && (
                 <Button variant="ghost" size="sm" asChild>
                    <a href={`tel:${provider.phone}`}>
                       <Phone className="mr-2 h-4 w-4" />
                        {provider.phone}
                    </a>
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  )
}

const distanceFilters = [
  { value: '2', label: '2 km' },
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '100', label: '100 km' },
  { value: 'all', label: 'All' },
];


export default function ServiceProvidersPage() {
  const [allProviders, setAllProviders] = useState<ServiceProvider[]>([]);
  const [providersWithDistance, setProvidersWithDistance] = useState<ServiceProviderWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDistance, setSelectedDistance] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    async function loadProviders() {
      setIsLoading(true);
      try {
        const fetchedProviders = await getServiceProviders();
        setAllProviders(fetchedProviders);
        setProvidersWithDistance(fetchedProviders); // Initially show all
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to load shops',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProviders();
  }, [toast]);

  const handleSetUserLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Location services are not supported by your browser.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
      },
      () => {
        toast({ variant: 'destructive', title: 'Could not get your location. Please ensure location services are enabled.' });
      }
    );
  };

  useEffect(() => {
    if (userLocation) {
      const calculatedProviders = allProviders
        .map(provider => {
          if (provider.lat && provider.lng) {
            const distance = getDistanceFromLatLonInKm(
              userLocation.lat,
              userLocation.lon,
              provider.lat,
              provider.lng
            );
            return { ...provider, distance };
          }
          return provider;
        })
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      
      setProvidersWithDistance(calculatedProviders);
    }
  }, [userLocation, allProviders]);

  const filteredProviders = useMemo(() => {
    if (selectedDistance === 'all' || !userLocation) {
      return providersWithDistance;
    }
    const maxDistance = Number(selectedDistance);
    return providersWithDistance.filter(p => p.distance !== undefined && p.distance <= maxDistance);
  }, [providersWithDistance, selectedDistance, userLocation]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Service Providers</h1>
        <p className="text-muted-foreground">
            Find trusted partners for bike fitting, repairs, and more.
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Filter by Distance</CardTitle>
          <CardDescription>
            Use your current location to find shops nearby.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button onClick={handleSetUserLocation} disabled={!!userLocation}>
            <LocateFixed className="mr-2 h-4 w-4" />
            {userLocation ? 'Location Set!' : 'Use My Location'}
          </Button>
          {userLocation && (
            <RadioGroup
              value={selectedDistance}
              onValueChange={setSelectedDistance}
              className="flex flex-wrap items-center gap-4"
            >
              {distanceFilters.map(({ value, label }) => (
                <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                  <RadioGroupItem value={value} id={`r-${value}`} />
                  <Label htmlFor={`r-${value}`}>{label}</Label>
                </FormItem>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : filteredProviders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map(provider => (
            <ServiceProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No Service Providers Found</h3>
            <p className="text-muted-foreground">Try expanding your distance filter or check back later.</p>
          </div>
      )}
    </div>
  );
}
