

'use server';

import { createClient } from '@supabase/supabase-js';
import { toDate } from '@/lib/date-utils';
import { verifyUserToken } from '@/lib/server-auth';
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
    
    const [{ data, error }, { data: open, error: openError }] = await Promise.all([
      supabase.from('service_providers').select('*').order('id', { ascending: true }),
      // Riders only see shops an admin approved that have a working card (migration 021).
      supabase.from('shop_billing').select('shop_id').not('approved_at', 'is', null).in('status', ['active', 'past_due']),
    ]);

    if (error) throw error;
    if (openError) throw openError;

    if (!data) return [];
    const accepting = new Set((open ?? []).map((b) => b.shop_id));

    // This list is public: never send billing details (Stripe customer ids).
    return data.filter((row) => accepting.has(row.id)).map(({ stripe_customer_id: _stripe, ...row }) => ({
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

const WORK_ORDERS_PER_DAY = 5;

export async function submitWorkOrderAction(
  idToken: string,
  request: {
    serviceProviderId: string;
    equipmentId: string;
    serviceType: string;
    notes?: string;
    userName?: string;
    userPhone?: string;
    userConsent: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  if (!request.serviceProviderId || !request.equipmentId) {
    return { success: false, message: 'Choose a shop and a bike.' };
  }
  if (!request.userConsent) {
    return { success: false, message: 'Please agree to share your bike details with the shop.' };
  }

  try {
    const { uid, email } = await verifyUserToken(idToken);
    const supabase = getSupabaseClient();

    // The shop must have an account (owner) so it can see the order.
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id, owner_id, shop_name')
      .eq('id', request.serviceProviderId)
      .maybeSingle();
    if (providerError) throw providerError;
    const shopAuthUid = provider?.owner_id || provider?.id;
    if (!provider || !/^[0-9a-f-]{36}$/i.test(shopAuthUid)) {
      return { success: false, message: "This shop isn't taking online bookings yet." };
    }

    // The bike must belong to the rider; denormalized details come from the DB.
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, brand, model, fit_data')
      .eq('id', request.equipmentId)
      .eq('user_id', uid)
      .maybeSingle();
    if (equipmentError) throw equipmentError;
    if (!equipment) return { success: false, message: 'Bike not found.' };

    // Each work order costs the shop a C$2 Service Ticket, so limit junk:
    // one open request per bike per shop, and a few per rider per day.
    const { count: openForBike } = await supabase.from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid).eq('equipment_id', equipment.id).eq('service_provider_id', provider.id)
      .not('status', 'in', '("Completed","Cancelled","cancelled")');
    if ((openForBike ?? 0) > 0) {
      return { success: false, message: `You already have an open request for this bike with ${provider.shop_name || 'this shop'}.` };
    }
    const { count: today } = await supabase.from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid).gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString());
    if ((today ?? 0) >= WORK_ORDERS_PER_DAY) {
      return { success: false, message: "You've sent the most service requests allowed today. Try again tomorrow." };
    }

    const { error } = await supabase.from('work_orders').insert([{
      id: crypto.randomUUID(),
      user_id: uid,
      user_name: request.userName || email || 'Rider',
      user_phone: request.userPhone || '',
      user_email: email || '',
      service_provider_id: provider.id,
      service_provider_auth_uid: shopAuthUid,
      provider_name: provider.shop_name || 'Shop',
      equipment_id: equipment.id,
      equipment_name: equipment.name,
      equipment_brand: equipment.brand,
      equipment_model: equipment.model,
      service_type: request.serviceType,
      notes: request.notes || null,
      fit_data: request.serviceType === 'bike-fitting' ? equipment.fit_data : null,
      user_consent: true,
      status: 'New',
    }]);

    if (error) {
      // Migration 020: a shop with an unpaid bill can't take new work orders.
      if (error.message?.includes('SHOP_NOT_ACCEPTING')) {
        return { success: false, message: `${provider.shop_name || 'This shop'} isn't taking online requests yet.` };
      }
      if (error.message?.includes('SHOP_PAUSED')) {
        return { success: false, message: `${provider.shop_name || 'This shop'} isn't taking online requests right now. Please contact the shop directly.` };
      }
      throw error;
    }

    return {
      success: true,
      message: `Work order sent to ${provider.shop_name || 'the shop'}.`,
    };

  } catch (error: any) {
    console.error("Failed to submit work order:", error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while submitting the work order.',
    };
  }
}
