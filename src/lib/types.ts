

import type { BikeType } from '@/lib/constants';

// Data from the master/central database
export interface MasterComponent {
  id: string;
  name: string;
  brand: string;
  series?: string;
  model?: string;
  system: string;
  size?: string; // For components with a single size, or as a default/base size.
  sizeVariants?: { [frameSize: string]: string }; // For components with size tied to frame, e.g. { "S": "170mm", "M": "172.5mm" }
  // Drivetrain specific
  chainring1?: string;
  chainring2?: string;
  chainring3?: string;
  // Future fields for lifespan analysis
  // manufacturerLifespanKm?: number;
  // observedAvgLifespanKm?: number;
}

// Data specific to a user's instance of a component
export interface UserComponent {
  id: string; // Unique ID for this specific instance
  masterComponentId: string; // Reference to the MasterComponent
  wearPercentage: number;
  lastServiceDate: Date | null;
  purchaseDate: Date;
  notes?: string;
  size?: string; // The specific size for this user's instance, resolved from size or sizeVariants.
}

// The combined object we'll use in the app UI
export interface Component extends MasterComponent, Omit<UserComponent, 'id' | 'masterComponentId'> {
  userComponentId: string;
}


export interface MaintenanceLog {
  id: string;
  date: Date;
  logType: 'service' | 'repair' | 'modification';
  description: string;
  cost: number;
  serviceType: 'diy' | 'shop';
  serviceProvider?: string;
  technician?: string;
  componentReplaced: boolean;
  isOEM?: boolean;
  replacementPart?: string;
  notes?: string;
}

export interface Equipment {
  id:string;
  name: string;
  type: BikeType | 'Running Shoes' | 'Other';
  brand: string;
  model: string;
  modelYear: number;
  serialNumber?: string;
  frameSize?: string;
  purchaseCondition: 'new' | 'used';
  purchaseDate: Date;
  purchasePrice: number;
  totalDistance: number;
  totalHours: number;
  imageUrl: string;
  components: Component[];
  maintenanceLog: MaintenanceLog[];
}
