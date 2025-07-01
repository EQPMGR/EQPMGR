export interface Component {
  id: string;
  name: string;
  wearPercentage: number;
  lastServiceDate: string | null;
  purchaseDate: string;
  notes?: string;
}

export interface MaintenanceLog {
  id: string;
  date: string;
  description: string;
  cost: number;
  serviceProvider?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'Road Bike' | 'Mountain Bike' | 'Running Shoes' | 'Other';
  brand: string;
  model: string;
  modelYear: number;
  serialNumber?: string;
  purchaseCondition: 'new' | 'used';
  purchaseDate: string;
  purchasePrice: number;
  totalDistance: number;
  totalHours: number;
  imageUrl: string;
  components: Component[];
  maintenanceLog: MaintenanceLog[];
}
