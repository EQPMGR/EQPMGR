export interface Component {
  id: string;
  name: string; // e.g., "Rear Derailleur"
  brand: string; // e.g., "Shimano"
  model: string; // e.g., "105 RD-5701"
  system: string;
  wearPercentage: number;
  lastServiceDate: Date | null;
  purchaseDate: Date;
  notes?: string;
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
  ownerId: string;
  name: string;
  type: 'Road Bike' | 'Mountain Bike' | 'Running Shoes' | 'Other';
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
  components: Component[];
  maintenanceLog: MaintenanceLog[];
}
