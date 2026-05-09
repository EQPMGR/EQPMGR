/**
 * Backend-agnostic Data Models
 * These types are independent of any specific backend provider
 */

import type { BikeType } from '@/lib/constants';

// ==================== User & Auth Types ====================

export interface UserProfile {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  phone?: string | null;
  photoURL: string | null;
  height?: number;
  weight?: number;
  shoeSize?: number;
  birthdate?: Date | null;
  measurementSystem: 'metric' | 'imperial';
  shoeSizeSystem: 'us-womens' | 'us-mens' | 'uk' | 'eu';
  distanceUnit: 'km' | 'miles';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

export interface UserDocument {
  displayName?: string;
  phone?: string;
  photoURL?: string;
  height?: number;
  weight?: number;
  shoeSize?: number;
  birthdate?: Date;
  measurementSystem?: 'metric' | 'imperial';
  shoeSizeSystem?: 'us-womens' | 'us-mens' | 'uk' | 'eu';
  distanceUnit?: 'km' | 'miles';
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
  createdAt?: Date;
  lastLogin?: Date;
}

// ==================== Component Types ====================

export interface MasterComponent {
  id: string;
  name: string;
  brand?: string;
  series?: string;
  model?: string;
  system: string;
  size?: string;
  sizeVariants?: string;
  chainring1?: string;
  chainring2?: string;
  chainring3?: string;
  embedding?: number[];
}

export interface UserComponent {
  id: string;
  parentUserComponentId?: string | null;
  masterComponentId: string;
  name: string;
  wearPercentage: number;
  lastServiceDate: Date | null;
  purchaseDate: Date;
  notes?: string;
  size?: string;
  wheelsetId?: string;
}

export interface Component extends MasterComponent, Omit<UserComponent, 'id' | 'masterComponentId'> {
  userComponentId: string;
}

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

// ==================== Maintenance Types ====================

export interface MaintenanceLog {
  id: string;
  date: Date;
  logType: 'service' | 'repair' | 'modification';
  description: string;
  cost: number;
  serviceType: 'diy' | 'shop';
  serviceProvider?: string;
  shopName?: string;
  technician?: string;
  componentReplaced: boolean;
  isOEM?: boolean;
  replacementPart?: string;
  notes?: string;
}

// ==================== Bike Fit Types ====================

export interface CleatPosition {
  foreAft?: number;
  lateral?: number;
  rotational?: number;
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
  cleatPosition?: CleatPosition;
}

// ==================== Equipment Types ====================

export interface Equipment {
  id: string;
  name: string;
  type: BikeType | 'Running Shoes' | 'Other' | 'Cycling Shoes';
  brand: string;
  model: string;
  modelYear: number;
  serialNumber?: string;
  frameSize?: string;
  size?: string;
  shoeSizeSystem?: 'us' | 'uk' | 'eu';
  purchaseCondition: 'new' | 'used';
  purchaseDate: Date;
  purchasePrice: number;
  totalDistance: number;
  totalHours: number;
  imageUrl: string;
  components: Component[];
  maintenanceLog: MaintenanceLog[];
  archivedComponents?: ArchivedComponent[];
  fitData?: BikeFitData;
  associatedEquipmentIds?: string[];
  wheelsets?: Record<string, string>;
}

// ==================== Service Provider Types ====================

export interface ServiceProvider {
  id: string;
  name: string;
  shopName?: string;
  logoUrl?: string;
  services: ('bike-fitting' | 'repairs' | 'rental')[];
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  website?: string;
  geohash?: string;
  lat?: number;
  lng?: number;
  averageRating?: number;
  ratingCount?: number;
  availability?: string;
  dropOff?: boolean;
  valetService?: boolean;
}

// ==================== Work Order Types ====================

export interface WorkOrder {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  serviceProviderId: string;
  providerName: string;
  equipmentId: string;
  equipmentName: string;
  equipmentBrand: string;
  equipmentModel: string;
  serviceType: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  fitData?: BikeFitData;
  createdAt: Date;
  userConsent: {
    consentGiven: boolean;
    timestamp: Date;
  };
}

// ==================== Bike Model Types ====================

export interface BikeModel {
  id: string;
  brand: string;
  model: string;
  year?: number;
  bikeType: BikeType;
  frameSizes?: string[];
  msrp?: number;
  imageUrl?: string;
  url?: string;
}

// ==================== Employee Types ====================

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  shopOwnerId: string;
  createdAt: Date;
}

// ==================== Training Data Types ====================

export interface TrainingData {
  id: string;
  prompt: string;
  completion: string;
  category?: string;
  createdAt: Date;
}

// ==================== Counter Types ====================

export interface Counter {
  id: string;
  count: number;
}

// ==================== Ignored Duplicates Types ====================

export interface IgnoredDuplicate {
  id: string;
  createdAt: Date;
}
