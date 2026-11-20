// Server-only: works out which catalog parts a garage bike is missing.
// Used by the rider's "Your bike seems incomplete" notice
// (equipment/[id]/incomplete-actions.ts) and Admin → Incomplete bikes.
// Not a 'use server' module: exports here must not become public endpoints.
import type { SupabaseClient } from '@supabase/supabase-js';
import { BIKE_TYPES } from '@/lib/constants';

/** A bike with fewer parts than this is "incomplete" even without a catalog model. */
export const FEW_PARTS_THRESHOLD = 8;
/** A catalog bike with fewer parts than this is listed as "thin" for admins. */
export const THIN_CATALOG_THRESHOLD = 15;

export function isBikeType(type: string | null | undefined) {
  return !!type && (BIKE_TYPES as readonly string[]).includes(type);
}

export type CatalogPartRow = {
  id: string; // bike_model_components.id
  bike_model_id: string;
  master_component_id: string;
  component_name: string | null;
  position: string | null;
  system: string | null;
  size: string | null;
  master_components: { name: string | null; brand: string | null; series: string | null; model: string | null; system: string | null; size: string | null } | null;
};

export type GaragePartRow = { equipment_id: string; master_component_id: string | null; name: string | null; is_active: boolean | null };

export type MissingPart = {
  catalogPartId: string;
  masterComponentId: string;
  slot: string;
  system: string | null;
  brand: string | null;
  series: string | null;
  model: string | null;
  size: string | null;
};

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

export function slotOf(row: CatalogPartRow) {
  return row.component_name || row.position || row.master_components?.name || 'Part';
}

/**
 * A catalog part counts as present when the bike has the same catalog part,
 * or any part in the same slot (e.g. a different Fork). Each garage part
 * covers at most one catalog part. Archived (replaced) parts don't count.
 */
export function findMissingParts(catalog: CatalogPartRow[], garage: GaragePartRow[]): MissingPart[] {
  const pool = garage.filter((g) => g.is_active !== false).map((g) => ({ ...g, used: false }));
  const remaining: CatalogPartRow[] = [];

  for (const row of catalog) {
    const hit = pool.find((g) => !g.used && g.master_component_id && g.master_component_id === row.master_component_id);
    if (hit) hit.used = true;
    else remaining.push(row);
  }

  const missing: MissingPart[] = [];
  for (const row of remaining) {
    const slot = norm(slotOf(row));
    const hit = pool.find((g) => !g.used && norm(g.name) === slot);
    if (hit) {
      hit.used = true;
      continue;
    }
    const m = row.master_components;
    missing.push({
      catalogPartId: row.id,
      masterComponentId: row.master_component_id,
      slot: slotOf(row),
      system: row.system || m?.system || null,
      brand: m?.brand ?? null,
      series: m?.series ?? null,
      model: m?.model ?? null,
      size: row.size || m?.size || null,
    });
  }
  return missing;
}

export const CATALOG_PART_COLUMNS =
  'id, bike_model_id, master_component_id, component_name, position, system, size, master_components(name, brand, series, model, system, size)';

// Ids go in the URL, so long lists are fetched in chunks; each chunk is read
// in pages because Supabase returns at most 1,000 rows per request.
const PAGE = 1000;
async function fetchAll<T>(
  ids: string[],
  page: (chunk: string[], from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const unique = [...new Set(ids)];
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await page(chunk, from, from + PAGE - 1);
      if (error) throw error;
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < PAGE) break;
    }
  }
  return out;
}

export function loadCatalogParts(supabase: SupabaseClient, bikeModelIds: string[]): Promise<CatalogPartRow[]> {
  return fetchAll<CatalogPartRow>(bikeModelIds, (chunk, from, to) =>
    supabase.from('bike_model_components').select(CATALOG_PART_COLUMNS).in('bike_model_id', chunk).order('id').range(from, to));
}

export function loadGarageParts(supabase: SupabaseClient, equipmentIds: string[]): Promise<GaragePartRow[]> {
  return fetchAll<GaragePartRow>(equipmentIds, (chunk, from, to) =>
    supabase.from('components').select('equipment_id, master_component_id, name, is_active').in('equipment_id', chunk).order('id').range(from, to));
}
