

import type { BikeType } from '@/lib/constants';

// Data from the master/central database
export interface MasterComponent {
  id: string;
  name: string;
  brand?: string;
  series?: string;
  model?: string;
  system: string;
  size?: string; // For components with a single size, or as a default/base size.
  sizeVariants?: string; // JSON string for components with size tied to frame, e.g. '{"S": "170mm", "M": "172.5mm"}'
  chainring1?: string;
  chainring2?: string;
  chainring3?: string;
  embedding?: number[]; // To store the vector embedding
}

// Data specific to a user's instance of a component
export interface UserComponent {
  id: string; // Unique ID for this specific instance (document ID in the subcollection)
  parentUserComponentId?: string | null; // ID of the parent UserComponent, if this is a sub-component
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

// Represents a component that has been replaced.
export interface ArchivedComponent {
    name: string;
    brand?: string;
    series?: string;
    model?: string;
    system: string;
    size?: string;
    wearPercentage: number;
    purchaseDate: string;
    lastServiceDate: string | null;
    replacedOn: string;
    finalMileage: number;
    replacementReason: 'failure' | 'modification' | 'upgrade';
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

export interface BikeFitData {
  saddleHeight?: number;
  saddleHeightOverBars?: number;
  saddleToHandlebarReach?: number;
  saddleAngle?: number;
  saddleForeAft?: number;
  saddleBrandModel?: string;
  stemLength?: number;
  stemAngle?: number;
  handlebarBrandModel?: string;
  handlebarWidth?: number;
  handlebarAngle?: number;
  handlebarExtension?: number;
  brakeLeverPosition?: string;
  crankLength?: number;
  hasAeroBars?: boolean;
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
  components: Component[]; // This will be populated at runtime, not stored in Firestore
  maintenanceLog: MaintenanceLog[];
  archivedComponents?: ArchivedComponent[];
  fitData?: BikeFitData;
}

export interface ServiceProvider {
  id: string;
  name: string;
  services: ('bike-fitting' | 'repairs')[];
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  website?: string;
  geohash?: string; // For location-based queries
}
