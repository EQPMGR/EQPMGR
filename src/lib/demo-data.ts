
import type { Equipment } from './types';

// This file contains hardcoded data for the clickable demo.

export const demoEquipment: Equipment[] = [
  {
    id: 'demo-bike-1',
    name: 'Gala Demo Bike',
    type: 'Road Bike',
    brand: 'Showcase',
    model: 'Virtuoso SLX',
    modelYear: 2024,
    serialNumber: 'DEMO123456789',
    purchaseCondition: 'new',
    purchaseDate: new Date('2024-03-15T00:00:00Z'),
    purchasePrice: 9500,
    totalDistance: 1580,
    totalHours: 52,
    imageUrl: 'https://placehold.co/600x400.png',
    frameSize: '56cm',
    maintenanceLog: [
      {
        id: 'm1',
        date: new Date('2024-05-20T00:00:00Z'),
        logType: 'service',
        description: 'Initial 100-mile tune-up.',
        cost: 75,
        serviceType: 'shop',
        serviceProvider: 'The Velo Shop',
      },
      {
        id: 'm2',
        date: new Date('2024-06-10T00:00:00Z'),
        logType: 'modification',
        description: 'Upgraded to carbon handlebars.',
        cost: 350,
        serviceType: 'diy',
        componentReplaced: true,
        isOEM: false,
        replacementPart: 'Enve SES Aero Handlebar'
      },
    ],
    components: [
      // Drivetrain
      { userComponentId: 'comp1', id: 'mc1', name: 'Rear Derailleur', brand: 'Shimano', model: 'RD-R9250', system: 'Drivetrain', wearPercentage: 65, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp2', id: 'mc2', name: 'Front Derailleur', brand: 'Shimano', model: 'FD-R9250', system: 'Drivetrain', wearPercentage: 40, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp3', id: 'mc3', name: 'Crankset', brand: 'Shimano', model: 'FC-R9200', system: 'Drivetrain', size: '172.5mm', wearPercentage: 55, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp4', id: 'mc4', name: 'Cassette', brand: 'Shimano', model: 'CS-R9200', system: 'Drivetrain', size: '11-34t', wearPercentage: 68, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp5', id: 'mc5', name: 'Chain', brand: 'Shimano', model: 'CN-M9100', system: 'Drivetrain', wearPercentage: 85, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      
      // Brakes
      { userComponentId: 'comp6', id: 'mc6', name: 'Brake Calipers', brand: 'Shimano', model: 'BR-R9270', system: 'Brakes', wearPercentage: 30, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp7', id: 'mc7', name: 'Brake Rotors', brand: 'Shimano', model: 'RT-CL900', system: 'Brakes', size: '160mm', wearPercentage: 45, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp8', id: 'mc8', name: 'Brake Levers', brand: 'Shimano', model: 'ST-R9270', system: 'Brakes', wearPercentage: 10, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },

      // Wheelset
      { userComponentId: 'comp9', id: 'mc9', name: 'Wheelset', brand: 'Enve', model: 'SES 4.5', system: 'Wheelset', wearPercentage: 20, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp10', id: 'mc10', name: 'Tires', brand: 'Continental', model: 'Grand Prix 5000 S TR', system: 'Wheelset', size: '700x28c', wearPercentage: 92, purchaseDate: new Date('2024-05-01T00:00:00Z'), lastServiceDate: null },

      // Frameset
      { userComponentId: 'comp11', id: 'mc11', name: 'Frame', brand: 'Showcase', model: 'Virtuoso SLX', system: 'Frameset', wearPercentage: 5, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp12', id: 'mc12', name: 'Fork', brand: 'Showcase', model: 'Virtuoso SLX', system: 'Frameset', wearPercentage: 5, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },

      // Cockpit
      { userComponentId: 'comp13', id: 'mc13', name: 'Handlebar', brand: 'Enve', model: 'SES Aero', system: 'Cockpit', wearPercentage: 5, purchaseDate: new Date('2024-06-10T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp14', id: 'mc14', name: 'Stem', brand: 'Showcase', model: 'AeroStem', system: 'Cockpit', wearPercentage: 5, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp15', id: 'mc15', name: 'Saddle', brand: 'Selle Italia', model: 'SLR Boost', system: 'Cockpit', wearPercentage: 15, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
      { userComponentId: 'comp16', id: 'mc16', name: 'Seatpost', brand: 'Showcase', model: 'Aero D-Post', system: 'Cockpit', wearPercentage: 5, purchaseDate: new Date('2024-03-15T00:00:00Z'), lastServiceDate: null },
    ],
  }
];
