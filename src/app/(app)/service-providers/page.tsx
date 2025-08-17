

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { StarRating } from '@/components/star-rating';
import { RequestServiceDialog } from '@/components/request-service-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface ServiceProviderWithDistance extends ServiceProvider {
  distance?: number;
}

function ServiceProviderCard({ provider }: { provider: ServiceProviderWithDistance }) {
  return (
    <Card className="flex flex-col">
       <CardHeader>
        {provider.logoUrl ? (
          <div className="relative h-[100px] w-[100px] mb-4 rounded-md overflow-hidden">
            <Image
              src={provider.logoUrl}
              alt={`${provider.shopName || provider.name} logo`}
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[100px] w-[100px] mb-4 bg-muted rounded-md">
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
      <CardContent className="space-y-4 flex-grow">
         <div className="flex flex-wrap gap-2">
            {provider.availability && <Badge variant="outline">{provider.availability}</Badge>}
            {provider.dropOff && <Badge variant="outline">Drop-off Service</Badge>}
            {provider.valetService && <Badge variant="outline">Valet Service</Badge>}
        </div>
        <div className="flex items-center gap-2">
            {provider.ratingCount && provider.ratingCount > 0 && provider.averageRating ? (
                 <>
                    <StarRating rating={provider.averageRating} />
                    <span className="text-xs text-muted-foreground">({provider.ratingCount} reviews)</span>
                 </>
            ) : (
                <p className="text-sm text-muted-foreground italic">Not rated yet, be the first!</p>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
            {provider.services.map(service => (
                <Badge key={service} variant="secondary">
                    {service.replace('-', ' ')}
                </Badge>
            ))}
        </div>
      </CardContent>
       <CardFooter className="mt-auto flex flex-col items-stretch gap-2">
        <RequestServiceDialog provider={provider} />
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
       </CardFooter>
    </Card>
  )
}

const distanceFilters = [
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: 'all', label: 'All' },
];


export default function ServiceProvidersPage() {
  const searchParams = useSearchParams();
  const [allProviders, setAllProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDistance, setSelectedDistance] = useState('all');
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const { toast } = useToast();
  
  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProviders = await getServiceProviders();
      setAllProviders(fetchedProviders);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load shops',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    const serviceFromUrl = searchParams.get('service');
    if (serviceFromUrl) {
      setSelectedServices([serviceFromUrl]);
    }
  }, [searchParams]);

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
  
  const handleServiceChange = (serviceId: string, checked: boolean | 'indeterminate') => {
      if (checked) {
          setSelectedServices(prev => [...prev, serviceId]);
      } else {
          setSelectedServices(prev => prev.filter(s => s !== serviceId));
      }
  }

  const filteredProviders = useMemo(() => {
    let providers: ServiceProviderWithDistance[] = allProviders;

    if (userLocation) {
        providers = providers.map(p => {
             if (p.lat && p.lng) {
                const distance = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lon, p.lat, p.lng);
                return { ...p, distance };
            }
            return p;
        }).sort((a,b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    
    if (selectedDistance !== 'all' && userLocation) {
        const maxDistance = Number(selectedDistance);
        providers = providers.filter(p => p.distance !== undefined && p.distance <= maxDistance);
    }
    
    if (selectedServices.length > 0) {
        providers = providers.filter(p => selectedServices.some(s => p.services.includes(s as any)));
    }

    return providers;
  }, [allProviders, userLocation, selectedDistance, selectedServices]);

  const availableServices = useMemo(() => {
      const services = new Set<string>();
      allProviders.forEach(p => p.services.forEach(s => services.add(s as string)));
      return Array.from(services);
  }, [allProviders]);

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
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
           <div className="space-y-2">
                <Label>Services</Label>
                <div className="flex flex-wrap items-center gap-4">
                    {availableServices.map(service => (
                       <FormItem key={service} className="flex items-center space-x-2 space-y-0">
                          <Checkbox 
                            id={service} 
                            checked={selectedServices.includes(service)}
                            onCheckedChange={(checked) => handleServiceChange(service, checked)}
                          />
                          <Label htmlFor={service} className="font-normal capitalize">{service.replace('-', ' ')}</Label>
                        </FormItem>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label>Distance</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Button onClick={handleSetUserLocation} disabled={!!userLocation} size="sm">
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
                </div>
            </div>
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
            <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
          </div>
      )}
    </div>
  );
}
