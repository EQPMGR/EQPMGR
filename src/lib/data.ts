
import type { Equipment } from './types';

export const equipmentData: Equipment[] = [
  {
    id: 'specialized-tarmac-1',
    name: 'Tarmac SL8',
    type: 'Road Bike',
    brand: 'Specialized',
    model: 'S-Works Tarmac SL9',
    modelYear: 2023,
    serialNumber: 'WSBC604285542S',
    purchaseCondition: 'new',
    purchaseDate: '2023-01-16',
    purchasePrice: 14000,
    totalDistance: 2540,
    totalHours: 85,
    imageUrl: 'https://placehold.co/600x400.png',
    components: [
      {
        id: 'c1',
        name: 'Drivetrain',
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
        name: 'Brakes',
        wearPercentage: 92,
        purchaseDate: '2023-01-15',
        lastServiceDate: '2023-11-10',
      },
      {
        id: 'c4',
        name: 'Suspension',
        wearPercentage: 15,
        purchaseDate: '2023-01-15',
        lastServiceDate: null,
      },
      {
        id: 'c5',
        name: 'Accessories',
        wearPercentage: 0,
        purchaseDate: '2023-01-15',
        lastServiceDate: null,
      },
      {
        id: 'c6',
        name: 'Frameset',
        wearPercentage: 5,
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
    imageUrl: 'https://placehold.co/600x400.png',
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
