/**
 * Backend-agnostic Data Models
 * These types are independent of any specific backend provider
 */

import type { BikeType } from '@/lib/constants';

// ==================== User & Auth Types ====================

export interface UserProfile {
  uid: string;
  email: string | null;
  email_verified: boolean;
  display_name: string | null;
  phone?: string | null;
  photo_url: string | null;
  height?: number;
  weight?: number;
  shoe_size?: number;
  birthdate?: Date | null;
  measurement_system: 'metric' | 'imperial';
  shoe_size_system: 'us-womens' | 'us-mens' | 'uk' | 'eu';
  distance_unit: 'km' | 'miles';
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
  get_id_token: (forceRefresh?: boolean) => Promise<string>;
}

export interface UserDocument {
  display_name?: string;
  phone?: string;
  photo_url?: string;
  height?: number;
  weight?: number;
  shoe_size?: number;
  birthdate?: Date;
  measurement_system?: 'metric' | 'imperial';
  shoe_size_system?: 'us-womens' | 'us-mens' | 'uk' | 'eu';
  distance_unit?: 'km' | 'miles';
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
  created_at?: Date;
  last_login?: Date;
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
  parent_user_component_id?: string | null;
  master_component_id: string;
  name: string;
  wear_percentage: number;
  last_service_date: Date | null;
  purchase_date: Date;
  notes?: string;
  size?: string;
  wheelset_id?: string;
}

export interface Component extends MasterComponent, Omit<UserComponent, 'id' | 'master_component_id'> {
  user_component_id: string;
}

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

// ==================== Maintenance Types ====================

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

// ==================== Bike Fit Types ====================

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

// ==================== Equipment Types ====================

export interface Equipment {
  id: string;
  name: string;
  type: BikeType | 'Running Shoes' | 'Other' | 'Cycling Shoes';
  brand: string;
  model: string;
  model_year: number;
  serial_number?: string;
  frame_size?: string;
  size?: string;
  shoe_size_system?: 'us' | 'uk' | 'eu';
  purchase_condition: 'new' | 'used';
  purchase_date: Date;
  purchase_price: number;
  total_distance: number;
  total_hours: number;
  image_url: string;
  components: Component[];
  maintenance_log: MaintenanceLog[];
  archived_components?: ArchivedComponent[];
  fit_data?: BikeFitData;
  associated_equipment_ids?: string[];
  wheelsets?: Record<string, string>;
}

// ==================== Service Provider Types ====================

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
  geohash?: string;
  lat?: number;
  lng?: number;
  average_rating?: number;
  rating_count?: number;
  availability?: string;
  drop_off?: boolean;
  valet_service?: boolean;
}

// ==================== Work Order Types ====================

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
  created_at: Date;
  user_consent: {
    consent_given: boolean;
    timestamp: Date;
  };
}

// ==================== Bike Model Types ====================

export interface BikeModel {
  id: string;
  brand: string;
  model: string;
  year?: number;
  bike_type: BikeType;
  frame_sizes?: string[];
  msrp?: number;
  image_url?: string;
  url?: string;
}

// ==================== Employee Types ====================

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  shop_owner_id: string;
  created_at: Date;
}

// ==================== Training Data Types ====================

export interface TrainingData {
  id: string;
  prompt: string;
  completion: string;
  category?: string;
  created_at: Date;
}

// ==================== Counter Types ====================

export interface Counter {
  id: string;
  count: number;
}

// ==================== Ignored Duplicates Types ====================

export interface IgnoredDuplicate {
  id: string;
  created_at: Date;
}
