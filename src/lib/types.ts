
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
  log_type: 'service' | 'repair' | 'modification';
  description: string;
  cost: number;
  service_type: 'diy' | 'shop';
  service_provider?: string;
  shop_name?: string;
  technician?: string;
  component_replaced: boolean;
  is_oem?: boolean;
  replacement_part?: string;
  notes?: string;
}

export interface CleatPosition {
    fore_aft?: number;
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
  components: Component[]; // This will be populated at runtime, not stored in Firestore
  maintenanceLog: MaintenanceLog[];
  archivedComponents?: ArchivedComponent[];
  fitData?: BikeFitData;
  associatedEquipmentIds?: string[];
  wheelsets?: Record<string, string>; // e.g. { "wheelsetId1": "Training Wheels" }
}

export interface ServiceProvider {
  id: string;
  name: string;
  shop_name?: string;
  logo_url?: string;
  services: ('bike-fitting' | 'repairs' | 'rental')[];
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone?: string;
  website?: string;
  geohash?: string; // For location-based queries
  lat?: number;
  lng?: number;
  average_rating?: number;
  rating_count?: number;
  availability?: string;
  drop_off?: boolean;
  valet_service?: boolean;
}

export interface WorkOrder {
    id: string;
    user_id: string;
    user_name: string;
    user_phone: string;
    user_email: string;
    service_provider_id: string;
    provider_name: string;
    equipment_id: string;
    equipment_name: string;
    equipment_brand: string;
    equipment_model: string;
    service_type: string;
    status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
    fit_data?: BikeFitData;
    created_at: Timestamp;
    user_consent: {
      consent_given: boolean;
      timestamp: Timestamp;
    };
}

// Timestamp type for database dates
export type Timestamp = Date | { _seconds: number; _nanoseconds: number } | string;
