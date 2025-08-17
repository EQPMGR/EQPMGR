

import type { ServiceProvider } from './types';

// This is a placeholder for your first service provider.
// We can expand this with more providers as you onboard them.
export const SERVICE_PROVIDERS_DATA: Omit<ServiceProvider, 'id'>[] = [
  {
    name: 'Vancouver Bike Fit Physio',
    shopName: 'Vancouver Bike Fit',
    services: ['bike-fitting', 'repairs'],
    address: '123 Main Street',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V5T 3N4',
    country: 'Canada',
    phone: '604-555-1234',
    website: 'https://www.example.com',
    logoUrl: 'https://placehold.co/300x100.png',
    lat: 49.2827,
    lng: -123.1207,
    geohash: 'c2b2q', 
  },
   {
    name: 'North Shore Bike Shop',
    shopName: 'North Shore Bike Shop',
    services: ['repairs'],
    address: '456 Mountain Highway',
    city: 'North Vancouver',
    province: 'BC',
    postalCode: 'V7J 2L3',
    country: 'Canada',
    phone: '604-987-6543',
    website: 'https://www.nsbike.com',
    logoUrl: 'https://placehold.co/300x100.png',
    lat: 49.3197,
    lng: -123.0722,
    geohash: 'c2b2v',
  },
];
