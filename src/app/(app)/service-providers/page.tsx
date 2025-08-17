
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getServiceProviders } from './actions';
import type { ServiceProvider } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Globe, Phone } from 'lucide-react';

function ServiceProviderCard({ provider }: { provider: ServiceProvider }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{provider.name}</CardTitle>
        <CardDescription>{provider.address}, {provider.city}</CardDescription>
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


export default function ServiceProvidersPage() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadProviders() {
      setIsLoading(true);
      try {
        const fetchedProviders = await getServiceProviders();
        setProviders(fetchedProviders);
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

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Service Providers</h1>
            <p className="text-muted-foreground">
                Find trusted partners for bike fitting, repairs, and more.
            </p>
        </div>
        {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
            </div>
        ) : providers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {providers.map(provider => (
                    <ServiceProviderCard key={provider.id} provider={provider} />
                ))}
            </div>
        ) : (
             <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Service Providers Found</h3>
                <p className="text-muted-foreground">Check back later or add a new provider in the admin panel.</p>
            </div>
        )}
    </div>
  );
}
