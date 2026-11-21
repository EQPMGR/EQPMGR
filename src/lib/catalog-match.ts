// Server-only: match a part description to an existing catalog part
// (master_components) so imports reuse parts instead of creating duplicates.
// Per-model lifespan learning (migration 017) depends on one catalog row per
// real-world part, so this matters for data quality, not just tidiness.
import type { SupabaseClient } from '@supabase/supabase-js';

export type PartQuery = { slot: string; brand?: string | null; series?: string | null; model?: string | null; system?: string | null };
export type CatalogPart = { id: string; name: string; brand: string | null; series: string | null; model: string | null; system: string | null };
export type CatalogMatch = { part: CatalogPart; score: number; kind: 'exact' | 'likely' };

// A "+" is part of a name: RockShox Deluxe Select+ is not Deluxe Select.
const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
const words = (s: string | null | undefined) => (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
/**
 * Slot a part fills. Front and rear tires, rotors and brakes are the same kind
 * of part; every other slot must match exactly (a front derailleur is never a
 * rear derailleur, a cassette is never a chain, even with the same series).
 */
const SAME_FRONT_REAR = /^(tire|tyre|rotor|brake)$/;
function kind(slot: string | null | undefined): string {
  const s = (slot || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/s$/, '');
  const unsided = s.replace(/^(front|rear)\s+/, '');
  return SAME_FRONT_REAR.test(unsided) ? unsided : s;
}

/**
 * Part codes (tokens with letters and digits, e.g. CN-M8100 -> cnm8100,
 * SM-RT64 -> smrt64). Tokens starting with a digit are sizes or specs, not
 * codes ("12-speed", "29x2.5", "160mm", "700c", "34T"), and are ignored.
 */
function codes(...parts: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const p of parts) {
    for (const raw of (p || '').split(/[\s,/()]+/)) {
      const n = norm(raw);
      if (n.length >= 3 && /\d/.test(n) && /^[a-z]/.test(n)) out.add(n);
    }
  }
  return out;
}

/** Two series conflict unless one's words contain the other's ("Deore XT" vs "XT" is fine; "105" vs "Tiagra" is not). */
function seriesConflict(a: string | null | undefined, b: string | null | undefined): boolean {
  const wa = words(a), wb = words(b);
  if (!wa.length || !wb.length) return false;
  return !wa.every((w) => wb.includes(w)) && !wb.every((w) => wa.includes(w));
}

/**
 * How sure we are that a catalog part is the part described (0 = not it).
 * Deliberately strict: a missed match only adds a duplicate catalog row, but
 * a wrong one links a bike to someone else's part and mixes their wear data.
 */
export function scoreMatch(q: PartQuery, c: CatalogPart): number {
  if (!q.brand || norm(q.brand) !== norm(c.brand)) return 0;
  if (kind(q.slot) !== kind(c.name)) return 0;
  if (seriesConflict(q.series, c.series)) return 0;

  const qm = norm(q.model), cm = norm(c.model), qs = norm(q.series), cs = norm(c.series);
  if (qm && cm && qm === cm && (!qs || !cs || qs === cs)) return 100;

  const qc = codes(q.series, q.model), cc = codes(c.series, c.model);
  if (qc.size && [...qc].some((x) => cc.has(x))) return 90;

  if (qs && cs && qs === cs && !qm && !cm) return 85;
  if (qs && cs && qs === cs && qm && cm) {
    const overlap = words(q.model).filter((w) => words(c.model).includes(w)).length;
    if (overlap > 0 && overlap >= Math.min(words(q.model).length, words(c.model).length)) return 85;
  }
  return 0;
}

/** Best catalog match per query (score >= 85), fetching candidates for all brands in one query. */
export async function matchCatalogParts(supabase: SupabaseClient, queries: PartQuery[]): Promise<(CatalogMatch | null)[]> {
  const brands = [...new Set(queries.map((q) => q.brand?.trim()).filter((b): b is string => !!b && !/[,()]/.test(b)))];
  if (brands.length === 0) return queries.map(() => null);

  const { data, error } = await supabase
    .from('master_components')
    .select('id, name, brand, series, model, system')
    .or(brands.map((b) => `brand.ilike.${b}`).join(','))
    .limit(5000);
  if (error) throw error;
  const candidates = (data ?? []) as CatalogPart[];

  return queries.map((q) => {
    let best: CatalogMatch | null = null;
    for (const c of candidates) {
      const score = scoreMatch(q, c);
      if (score >= 85 && (!best || score > best.score)) best = { part: c, score, kind: score >= 100 ? 'exact' : 'likely' };
    }
    return best;
  });
}
