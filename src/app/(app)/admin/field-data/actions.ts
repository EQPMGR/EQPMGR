'use server';

import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/server-auth';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function count(supabase: ReturnType<typeof getSupabaseClient>, table: string, filter?: (q: any) => any) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

/** Field data for admins: what the wear model has learned so far (migration 017 views). */
export async function getFieldDataAction(idToken: string) {
  await verifyAdminToken(idToken);
  const supabase = getSupabaseClient();

  const [rides, wetRides, unknownWeather, measurements, shopMeasurements, wornOut] = await Promise.all([
    count(supabase, 'rides'),
    count(supabase, 'rides', (q) => q.eq('weather_status', 'wet')),
    count(supabase, 'rides', (q) => q.eq('weather_status', 'unknown')),
    count(supabase, 'component_measurements'),
    count(supabase, 'component_measurements', (q) => q.eq('measured_by_role', 'shop')),
    count(supabase, 'component_replacement_events', (q) => q.eq('replacement_reason', 'failure')),
  ]);

  const [{ data: baselines, error: bErr }, { data: learned, error: lErr }, { data: stretch, error: sErr }, { data: calibration, error: cErr }] =
    await Promise.all([
      supabase.from('wear_baselines').select('component_key, label, basis, road_km, offroad_km, service_hours, confidence').order('priority'),
      supabase.from('report_part_lifespans').select('*').or('n_model.gt.0,n_series.gt.0,n_brand.gt.0,n_type.gt.0').order('n_model', { ascending: false }).limit(200),
      supabase.from('report_drivetrain_vs_chain_stretch').select('*'),
      supabase.from('report_stretch_vs_prediction').select('*').order('month', { ascending: false }).limit(24),
    ]);
  const firstError = bErr || lErr || sErr || cErr;
  if (firstError) throw firstError;

  // AI import spend (Claude Haiku 5.5: $0.10 / $0.50 per million input / output tokens).
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: imports } = await supabase.from('bike_imports').select('created_at, method, input_tokens, output_tokens').gte('created_at', monthAgo);
  const usage = (rows: any[]) => ({
    imports: rows.length,
    aiImports: rows.filter((r) => r.method === 'ai').length,
    costUsd: Math.round(rows.reduce((s, r) => s + (r.input_tokens || 0) * 0.10 / 1e6 + (r.output_tokens || 0) * 0.50 / 1e6, 0) * 10000) / 10000,
  });
  const importUsage = { last24h: usage((imports ?? []).filter((r: any) => r.created_at >= dayAgo)), last30d: usage(imports ?? []) };

  return {
    importUsage,
    totals: { rides, wetRides, unknownWeather, measurements, shopMeasurements, wornOutReplacements: wornOut },
    baselines: baselines ?? [],
    learned: learned ?? [],
    stretch: stretch ?? [],
    calibration: calibration ?? [],
  };
}
