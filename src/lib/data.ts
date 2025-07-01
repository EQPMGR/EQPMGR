import type { Equipment } from './types';

export const equipmentData: Equipment[] = [
  {
    id: 'specialized-tarmac-1',
    name: 'Tarmac SL7',
    type: 'Road Bike',
    brand: 'Specialized',
    model: 'S-Works Tarmac SL7',
    modelYear: 2023,
    serialNumber: 'WSBC604285542S',
    purchaseCondition: 'new',
    purchaseDate: '2023-01-15',
    purchasePrice: 14000,
    totalDistance: 2540,
    totalHours: 85,
    imageUrl: 'https://images.unsplash.com/photo-1559348331-57d46931c890?q=80&w=600&h=400&auto=format&fit=crop',
    components: [
      {
        id: 'c1',
        name: 'Chain',
        wearPercentage: 75,
        purchaseDate: '2023-01-15',
        lastServiceDate: '2023-09-01',
      },
      {
        id: 'c2',
        name: 'Tires',
        wearPercentage: 45,
        purchaseDate: '2023-07-20',
        lastServiceDate: null,
      },
      {
        id: 'c3',
        name: 'Brake Pads',
        wearPercentage: 92,
        purchaseDate: '2023-01-15',
        lastServiceDate: '2023-11-10',
      },
      {
        id: 'c4',
        name: 'Cassette',
        wearPercentage: 60,
        purchaseDate: '2023-01-15',
        lastServiceDate: null,
      },
    ],
    maintenanceLog: [
      {
        id: 'm1',
        date: '2023-09-01',
        description: 'Full tune-up and chain cleaning.',
        cost: 75,
        serviceProvider: 'Local Bike Shop'
      },
      {
        id: 'm2',
        date: '2023-11-10',
        description: 'Replaced brake pads.',
        cost: 40,
        serviceProvider: 'DIY'
      },
    ],
  },
  {
    id: 'trek-fuel-ex-1',
    name: 'Fuel EX 8',
    type: 'Mountain Bike',
    brand: 'Trek',
    model: 'Fuel EX 8 Gen 6',
    modelYear: 2022,
    serialNumber: 'WTU123G0456H',
    purchaseCondition: 'used',
    purchaseDate: '2022-11-20',
    purchasePrice: 3500,
    totalDistance: 1250,
    totalHours: 110,
    imageUrl: 'https://images.unsplash.com/photo-1572115244513-4841c73a4b9a?q=80&w=600&h=400&auto=format&fit=crop',
    components: [
      {
        id: 't1',
        name: 'Suspension Fork',
        wearPercentage: 35,
        purchaseDate: '2022-11-20',
        lastServiceDate: '2023-10-05',
      },
      {
        id: 't2',
        name: 'Rear Shock',
        wearPercentage: 40,
        purchaseDate: '2022-11-20',
        lastServiceDate: '2023-10-05',
      },
      {
        id: 't3',
        name: 'Tires',
        wearPercentage: 88,
        purchaseDate: '2023-08-15',
        lastServiceDate: null,
      },
       {
        id: 't4',
        name: 'Dropper Post',
        wearPercentage: 25,
        purchaseDate: '2022-11-20',
        lastServiceDate: '2023-10-05',
      },
    ],
    maintenanceLog: [
      {
        id: 'tm1',
        date: '2023-10-05',
        description: 'Suspension service (fork and shock).',
        cost: 150,
        serviceProvider: 'Suspension Experts Inc.'
      },
       {
        id: 'tm2',
        date: '2023-08-15',
        description: 'New tires (Maxxis Minion DHF/DHR)',
        cost: 180,
        serviceProvider: 'Local Bike Shop'
      },
    ],
  },
];
