import type { BikeType } from '@/lib/constants';

// Data from the master/central database
export interface MasterComponent {
  id: string;
  name: string;
  brand: string;
  series?: string;
  model?: string;
  system: string;
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
}

// The combined object we'll use in the app UI
export interface Component extends MasterComponent, Omit<UserComponent, 'id' | 'masterComponentId'> {
  userComponentId: string;
}


export interface MaintenanceLog {
  id: string;
  date: Date;
  logType: 'service' | 'repair' | 'modification' | 'replacement';
  description: string;
  cost: number;
  serviceType: 'diy' | 'shop';
  serviceProvider?: string;
  technician?: string;
  replacedComponentId?: string; // ID of the UserComponent that was replaced
  replacementReason?: 'worn' | 'damaged' | 'upgrade' | 'other';
  newComponentId?: string; // ID of the new UserComponent that was installed
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
  purchaseCondition: 'new' | 'used';
  purchaseDate: Date;
  purchasePrice: number;
  totalDistance: number;
  totalHours: number;
  imageUrl: string;
  components: Component[]; // This will now be the combined type
  maintenanceLog: MaintenanceLog[];
}
