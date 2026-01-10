

import type { BikeType } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

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
  parent_user_component_id?: string | null; // ID of the parent UserComponent, if this is a sub-component
  master_component_id: string; // Reference to the MasterComponent
  name: string; // Denormalized for easier querying/display
  wear_percentage: number;
  last_service_date: Date | null;
  purchase_date: Date;
  notes?: string;
  size?: string; // The specific size for this user's instance, resolved from size or sizeVariants.
  wheelset_id?: string; // To associate a component with a specific wheelset
}

// The combined object we'll use in the app UI
export interface Component extends MasterComponent, Omit<UserComponent, 'id' | 'master_component_id'> {
  user_component_id: string;
}

// Represents a component that has been replaced.
export interface ArchivedComponent {
    name: string;
    brand?: string;
    series?: string;
    model?: string;
    system: string;
    size?: string;
    wear_percentage: number;
    purchase_date: string;
    last_service_date: string | null;
    replaced_on: string;
    final_mileage: number;
    replacement_reason: 'failure' | 'modification' | 'upgrade';
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
  saddle_height?: number;
  saddle_height_over_bars?: number;
  saddle_to_handlebar_reach?: number;
  saddle_angle?: number;
  saddle_fore_aft?: number;
  saddle_brand_model?: string;
  stem_length?: number;
  stem_angle?: number;
  handlebar_brand_model?: string;
  handlebar_width?: number;
  handlebar_angle?: number;
  handlebar_extension?: number;
  brake_lever_position?: string;
  crank_length?: number;
  has_aero_bars?: boolean;
  cleat_position?: CleatPosition;
}

export interface Equipment {
  id:string;
  name: string;
  type: BikeType | 'Running Shoes' | 'Other' | 'Cycling Shoes';
  brand: string;
  model: string;
  model_year: number;
  serial_number?: string;
  frame_size?: string;
  size?: string; // For shoes
  shoe_size_system?: 'us' | 'uk' | 'eu'; // For shoes
  purchase_condition: 'new' | 'used';
  purchase_date: Date;
  purchase_price: number;
  total_distance: number;
  total_hours: number;
  image_url: string;
  components: Component[]; // This will be populated at runtime, not stored in Firestore
  maintenance_log: MaintenanceLog[];
  archived_components?: ArchivedComponent[];
  fit_data?: BikeFitData;
  associated_equipment_ids?: string[];
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
