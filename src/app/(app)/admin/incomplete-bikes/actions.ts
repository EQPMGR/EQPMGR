'use server';

import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/server-auth';
import {
  FEW_PARTS_THRESHOLD,
  THIN_CATALOG_THRESHOLD,
  findMissingParts,
  isBikeType,
  loadCatalogParts,
  loadGarageParts,
} from '@/lib/incomplete-bikes';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

// Reads every row of a small table in pages (Supabase caps a request at 1,000 rows).
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

type BikeModelRow = { id: string; brand: string; model: string; model_year: number | null; created_by: string | null; created_at: string | null };
type EquipmentRow = { id: string; name: string | null; brand: string | null; model: string | null; type: string | null; user_id: string; master_bike_model_id: string | null; created_at: string | null };

/** Admin → Incomplete bikes: garage bikes missing parts, and catalog bikes with few parts. */
export async function getIncompleteBikesAction(idToken: string) {
  await verifyAdminToken(idToken);
  const supabase = getSupabaseClient();

  const [models, equipment] = await Promise.all([
    readAll<BikeModelRow>((from, to) =>
      supabase.from('bike_models').select('id, brand, model, model_year, created_by, created_at').order('id').range(from, to)),
    readAll<EquipmentRow>((from, to) =>
      supabase.from('equipment').select('id, name, brand, model, type, user_id, master_bike_model_id, created_at').order('id').range(from, to)),
  ]);

  const bikes = equipment.filter((e) => isBikeType(e.type));
  const [catalogParts, garageParts] = await Promise.all([
    loadCatalogParts(supabase, models.map((m) => m.id)),
    loadGarageParts(supabase, bikes.map((b) => b.id)),
  ]);

  const catalogByModel = new Map<string, typeof catalogParts>();
  for (const row of catalogParts) catalogByModel.set(row.bike_model_id, [...(catalogByModel.get(row.bike_model_id) ?? []), row]);
  const garageByBike = new Map<string, typeof garageParts>();
  for (const row of garageParts) garageByBike.set(row.equipment_id, [...(garageByBike.get(row.equipment_id) ?? []), row]);
  const modelById = new Map(models.map((m) => [m.id, m]));

  const incompleteBikes = bikes
    .map((b) => {
      const garage = garageByBike.get(b.id) ?? [];
      const catalog = b.master_bike_model_id ? catalogByModel.get(b.master_bike_model_id) ?? [] : [];
      const missing = findMissingParts(catalog, garage);
      const partCount = garage.filter((g) => g.is_active !== false).length;
      const model = b.master_bike_model_id ? modelById.get(b.master_bike_model_id) : undefined;
      return {
        equipmentId: b.id,
        userId: b.user_id,
        bikeName: b.name || [b.brand, b.model].filter(Boolean).join(' ') || 'Unnamed bike',
        type: b.type,
        createdAt: b.created_at,
        partCount,
        catalogModel: model ? `${model.brand} ${model.model}${model.model_year ? ` (${model.model_year})` : ''}` : null,
        catalogPartCount: b.master_bike_model_id ? catalog.length : null,
        missing: missing.map((m) => m.slot),
        incomplete: missing.length > 0 || partCount < FEW_PARTS_THRESHOLD,
      };
    })
    .filter((b) => b.incomplete);

  const userIds = [...new Set([...incompleteBikes.map((b) => b.userId), ...models.map((m) => m.created_by).filter((id): id is string => !!id)])];
  const users = new Map<string, { name: string | null; email: string | null }>();
  for (let i = 0; i < userIds.length; i += 100) {
    const { data, error } = await supabase.from('app_users').select('id, display_name, email').in('id', userIds.slice(i, i + 100));
    if (error) throw error;
    for (const u of data ?? []) users.set(u.id, { name: u.display_name, email: u.email });
  }

  const thinCatalog = models
    .map((m) => ({
      bikeModelId: m.id,
      name: `${m.brand} ${m.model}${m.model_year ? ` (${m.model_year})` : ''}`,
      partCount: (catalogByModel.get(m.id) ?? []).length,
      createdBy: m.created_by ? users.get(m.created_by) ?? null : null,
      createdAt: m.created_at,
      garageBikes: equipment.filter((e) => e.master_bike_model_id === m.id).length,
    }))
    .filter((m) => m.partCount < THIN_CATALOG_THRESHOLD)
    .sort((a, b) => a.partCount - b.partCount);

  return {
    thresholds: { fewParts: FEW_PARTS_THRESHOLD, thinCatalog: THIN_CATALOG_THRESHOLD },
    incompleteBikes: incompleteBikes
      .map(({ userId, incomplete: _incomplete, ...b }) => ({ ...b, rider: users.get(userId) ?? null }))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    thinCatalog,
  };
}
