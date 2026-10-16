
'use server';

import { verifyAdminToken } from '@/lib/server-auth';

import { createClient } from '@supabase/supabase-js';
import type { AddProviderFormValues } from './page';

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

const createProviderId = (name: string, city: string) => {
    return `${name}-${city}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export async function addServiceProviderAction({
    idToken,
    values,
}: {
    idToken: string;
    values: AddProviderFormValues;
}): Promise<{ success: boolean; message: string }> {

    const providerId = createProviderId(values.name, values.city);

    try {
      await verifyAdminToken(idToken);
        const supabase = getSupabaseClient();

        // Check if provider already exists
        const { data: existingProvider, error: checkError } = await supabase
          .from('service_providers')
          .select('id')
          .eq('id', providerId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingProvider) {
            return {
                success: false,
                message: `A service provider with this name and city already exists (ID: ${providerId}).`,
            };
        }

        // Convert to snake_case for database
        const providerToSave = convertKeysToSnakeCase({
            ...values,
            geohash: 'c2b2q', // Placeholder for Vancouver
        });

        const { error } = await supabase
          .from('service_providers')
          .insert([{
            id: providerId,
            ...providerToSave
          }]);

        if (error) throw error;

        return {
            success: true,
            message: `${values.name} has been added to the service provider directory.`,
        };

    } catch (error: any) {
        console.error("Failed to add service provider:", error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred while saving the provider.',
        };
    }
}
