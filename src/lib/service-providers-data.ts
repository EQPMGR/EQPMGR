
import type { ServiceProvider } from './types';

// This is a placeholder for your first service provider.
// We can expand this with more providers as you onboard them.
export const SERVICE_PROVIDERS_DATA: Omit<ServiceProvider, 'id'>[] = [
  {
    name: 'Vancouver Bike Fit Physio',
    services: ['bike-fitting'],
    address: '123 Main Street',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V5T 3N4',
    country: 'Canada',
    phone: '604-555-1234',
    website: 'https://www.example.com',
    // Geohash for Vancouver, BC. We'll generate this dynamically in a real application.
    geohash: 'c2b2q', 
  },
];
