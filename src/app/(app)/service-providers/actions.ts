

'use server';

import { createClient } from '@supabase/supabase-js';
import type { ServiceProvider, WorkOrder } from '@/lib/types';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

/**
 * Convert camelCase to snake_case for database operations
 */
function camelToSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Recursively convert object keys from camelCase to snake_case
 */
function convertKeysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      converted[snakeKey] = convertKeysToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * Convert snake_case to camelCase for application use
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Recursively convert object keys from snake_case to camelCase
 */
function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = convertKeysToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

export async function getServiceProviders(): Promise<ServiceProvider[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    if (!data) return [];

    return data.map(row => ({
      id: row.id,
      ...convertKeysToCamelCase(row),
    } as ServiceProvider));
  } catch (error) {
    console.error("Error fetching service providers:", error);
    if ((error as any).code === 'permission-denied' || (error as any).code === '403') {
        throw new Error('You do not have permission to access service providers. Please check your backend security rules.');
    }
    throw new Error("Could not fetch service providers from the database.");
  }
}

export async function submitWorkOrderAction(workOrderData: Omit<WorkOrder, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; message: string }> {
  if (!workOrderData.userId || !workOrderData.serviceProviderId) {
    return { success: false, message: 'User or Service Provider ID is missing.' };
  }

  try {
    const supabase = getSupabaseClient();

    // Generate a new UUID-like ID (Supabase uses UUIDs by default)
    const { data: uuidData } = await supabase.rpc('uuid_generate_v4');
    const newWorkOrderId = uuidData || crypto.randomUUID();

    const newWorkOrder: WorkOrder = {
      id: newWorkOrderId,
      ...workOrderData,
      status: 'pending',
      createdAt: new Date(),
      userConsent: {
          ...workOrderData.userConsent,
          timestamp: workOrderData.userConsent.timestamp instanceof Date
            ? workOrderData.userConsent.timestamp
            : new Date(workOrderData.userConsent.timestamp),
      },
    };

    // Convert to snake_case for database
    const dbData = convertKeysToSnakeCase(newWorkOrder);

    const { error } = await supabase
      .from('work_orders')
      .insert([dbData]);

    if (error) throw error;

    return {
      success: true,
      message: `Work order successfully submitted to ${workOrderData.providerName}.`,
    };

  } catch (error: any) {
    console.error("Failed to submit work order:", error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while submitting the work order.',
    };
  }
}
