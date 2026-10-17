
/**
 * APPLICATION TYPE DEFINITIONS
 * 
 * ============================================================================
 * NAMING CONVENTION: camelCase (JavaScript/TypeScript Standard)
 * ============================================================================
 * 
 * These interfaces define how data is structured in the application layer.
 * All properties use camelCase following JavaScript naming conventions.
 * 
 * IMPORTANT: These properties are automatically converted between camelCase
 * (application layer) and snake_case (database layer) by the SupabaseDbAdapter.
 * Developers never interact with raw snake_case keys.
 * 
 * For database schema mapping, see: supabase/migrations/*.sql (uses snake_case)
 * 
 * Example Property Mapping:
 *   Application (TypeScript):   userId, purchaseDate, fitData
 *   ↓ (SupabaseDbAdapter conversion)
 *   Database (PostgreSQL):      user_id, purchase_date, fit_data
 * 
 * ============================================================================
 */

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
  recommendedIntervalKm?: number;
  replacementIntervalKm?: number;
  observedIntervalKmAvg?: number;
  observedIntervalKmCount?: number;
  observedIntervalKmMedian?: number;
  slug?: string;
  embedding?: number[]; // To store the vector embedding
}

export interface BikeModelComponent {
  id: string;
  bikeModelId: string;
  masterComponentId: string;
  componentName?: string;
  system?: string;
  position?: string;
  size?: string;
  chainring1?: string;
  chainring2?: string;
  chainring3?: string;
}

// Data specific to a user's instance of a component
export interface UserComponent {
  id: string; // Unique ID for this specific instance (document ID in the subcollection)
  equipmentId?: string;
  userId?: string;
  parentUserComponentId?: string | null; // ID of the parent UserComponent, if this is a sub-component
  masterComponentId: string; // Reference to the MasterComponent
  name: string; // Denormalized for easier querying/display
  wearPercentage: number;
  lastServiceDate: Date | null;
  purchaseDate: Date;
  installedAtDistance?: number;
  currentDistance?: number;
  expectedReplacementKm?: number;
  isActive?: boolean;
  replacementCount?: number;
  installedAt?: Date;
  notes?: string;
  size?: string; // The specific size for this user's instance, resolved from size or sizeVariants.
  wheelsetId?: string; // To associate a component with a specific wheelset
  replacedByUser?: boolean;
}

// The combined object we'll use in the app UI
export interface Component extends MasterComponent, Omit<UserComponent, 'id'> {
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
  shopName?: string;
  technician?: string;
  componentReplaced: boolean;
  isOem?: boolean;
  replacementPart?: string;
  notes?: string;
}

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

export interface Equipment {
  id: string;
  masterBikeModelId?: string;
  name: string;
  type: BikeType | 'Running Shoes' | 'Other' | 'Cycling Shoes';
  brand: string;
  model: string;
  modelYear: number;
  serialNumber?: string;
  frameSize?: string;
  size?: string; // For shoes
  shoeSizeSystem?: 'us' | 'uk' | 'eu'; // For shoes
  purchaseCondition: 'new' | 'used';
  purchaseDate: Date;
  purchasePrice: number;
  totalDistance: number;
  totalHours: number;
  imageUrl: string;
  components: Component[]; // Populated at runtime from the components table
  maintenanceLog: MaintenanceLog[];
  archivedComponents?: ArchivedComponent[];
  fitData?: BikeFitData;
  associatedEquipmentIds?: string[];
  wheelsets?: Record<string, string>; // e.g. { "wheelsetId1": "Training Wheels" }
}

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
  geohash?: string; // For location-based queries
  lat?: number;
  lng?: number;
  averageRating?: number;
  ratingCount?: number;
  availability?: string;
  dropOff?: boolean;
  valetService?: boolean;
}

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
    serviceProviderAuthUid?: string;
    /** One of WORK_ORDER_STATUSES (src/lib/work-orders.ts); the shop app sets these. */
    status: string;
    notes?: string;
    fitData?: BikeFitData;
    createdAt: Timestamp;
    /** Rider agreed to share their bike details with the shop. */
    userConsent: boolean;
}

// Timestamp type for database dates
export type Timestamp = Date | { _seconds: number; _nanoseconds: number } | string;
