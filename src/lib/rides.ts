// Server-only: store a ride once and apply its wear (supabase/migrations/016).
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRideWeather, type RideWeather } from '@/lib/ride-weather';

const OFFROAD_SPORTS = new Set(['MountainBikeRide', 'EMountainBikeRide', 'GravelRide']);
const EBIKE_SPORTS = new Set(['EBikeRide', 'EMountainBikeRide']);
const OFFROAD_BIKE_TYPES = /(gravel|cyclocross|cross country|mountain|enduro|downhill|dirt|all mountain)/i;

/** Strava's ride type wins; otherwise go by the bike's type. */
export function rideTerrain(sportType: string | null | undefined, bikeType: string | null | undefined): 'road' | 'offroad' {
  if (sportType) return OFFROAD_SPORTS.has(sportType) ? 'offroad' : 'road';
  return OFFROAD_BIKE_TYPES.test(bikeType ?? '') ? 'offroad' : 'road';
}

export function rideIsEbike(sportType: string | null | undefined, bikeType: string | null | undefined): boolean {
  return (sportType ? EBIKE_SPORTS.has(sportType) : false) || /e-bike/i.test(bikeType ?? '');
}

export type RideSource = 'strava' | 'manual' | 'file';

export type NewRide = {
  userId: string;
  equipmentId: string;
  source: RideSource;
  externalId?: string | null;
  name?: string | null;
  startedAt: Date;
  distanceKm: number;
  movingHours: number;
  /** Metres climbed; drives the hill factor. */
  elevationGainM?: number | null;
  sportType?: string | null;
  terrain: 'road' | 'offroad';
  isEbike: boolean;
  lat?: number | null;
  lng?: number | null;
  /** Rider says it was wet/dry; skips the weather lookup's verdict. */
  weatherOverride?: 'wet' | 'dry' | null;
};

export type RecordedRide = {
  alreadyRecorded: boolean;
  /** Set when the same ride was already counted from another source (e.g. Strava and an uploaded file). */
  duplicateOf?: RideSource;
  weather: RideWeather;
};

const SAME_RIDE_WINDOW_MS = 5 * 60_000;

/**
 * One rider can't do two rides at once: a ride starting within 5 minutes of an
 * existing one, with about the same distance, is the same ride arriving a
 * second way (Strava sync, file upload, typed in by hand). Counting it again
 * would double the wear.
 */
async function findSameRide(supabase: SupabaseClient, ride: NewRide) {
  const t = ride.startedAt.getTime();
  const { data, error } = await supabase
    .from('rides')
    .select('id, source, distance_km, weather_status, weather_summary, precip_during_mm, precip_before_mm')
    .eq('user_id', ride.userId)
    .gte('started_at', new Date(t - SAME_RIDE_WINDOW_MS).toISOString())
    .lte('started_at', new Date(t + SAME_RIDE_WINDOW_MS).toISOString())
    .limit(10);
  if (error) throw error;
  const tolerance = Math.max(1, ride.distanceKm * 0.15);
  return (data ?? []).find((r) => Math.abs(Number(r.distance_km) - ride.distanceKm) <= tolerance) ?? null;
}

export async function recordRideAndApplyWear(supabase: SupabaseClient, ride: NewRide): Promise<RecordedRide> {
  if (ride.externalId) {
    const { data: existing } = await supabase
      .from('rides')
      .select('id, weather_status, weather_summary, precip_during_mm, precip_before_mm')
      .eq('source', ride.source)
      .eq('external_id', ride.externalId)
      .maybeSingle();
    if (existing) {
      return {
        alreadyRecorded: true,
        weather: {
          status: existing.weather_status,
          summary: existing.weather_summary,
          precipDuringMm: existing.precip_during_mm,
          precipBeforeMm: existing.precip_before_mm,
        },
      };
    }
  }

  const same = await findSameRide(supabase, ride);
  if (same) {
    return {
      alreadyRecorded: true,
      duplicateOf: same.source as RideSource,
      weather: {
        status: same.weather_status,
        summary: same.weather_summary,
        precipDuringMm: same.precip_during_mm,
        precipBeforeMm: same.precip_before_mm,
      },
    };
  }

  // Snapshot the rider's weight (profile stores kg) for the weight factor.
  const { data: rider } = await supabase.from('app_users').select('weight').eq('id', ride.userId).maybeSingle();
  const riderWeightKg = typeof rider?.weight === 'number' && rider.weight > 20 && rider.weight < 250 ? rider.weight : null;

  const looked = await getRideWeather({ lat: ride.lat, lng: ride.lng, startedAt: ride.startedAt, movingHours: ride.movingHours });
  const weather: RideWeather = ride.weatherOverride
    ? { ...looked, status: ride.weatherOverride, summary: [`Marked ${ride.weatherOverride} by rider`, looked.summary].filter(Boolean).join('; ') }
    : looked;

  const { data: inserted, error } = await supabase
    .from('rides')
    .insert({
      user_id: ride.userId,
      equipment_id: ride.equipmentId,
      source: ride.source,
      external_id: ride.externalId ?? null,
      name: ride.name ?? null,
      started_at: ride.startedAt.toISOString(),
      distance_km: Math.round(ride.distanceKm * 100) / 100,
      moving_hours: Math.round(ride.movingHours * 1000) / 1000,
      elevation_gain_m: ride.elevationGainM != null && ride.elevationGainM >= 0 ? Math.round(ride.elevationGainM) : null,
      rider_weight_kg: riderWeightKg,
      sport_type: ride.sportType ?? null,
      terrain: ride.terrain,
      is_ebike: ride.isEbike,
      lat: ride.lat ?? null,
      lng: ride.lng ?? null,
      weather_status: weather.status,
      weather_source: ride.weatherOverride ? 'rider' : weather.status === 'unknown' ? null : 'weatherapi',
      weather_summary: weather.summary,
      precip_during_mm: weather.precipDuringMm,
      precip_before_mm: weather.precipBeforeMm,
    })
    .select('id')
    .single();

  if (error) {
    // Another request recorded the same ride (same Strava id or same file) first.
    if (error.code === '23505') return { alreadyRecorded: true, weather };
    throw error;
  }

  const { error: applyError } = await supabase.rpc('apply_ride_wear', { p_ride_id: inserted.id });
  if (applyError) throw applyError;

  return { alreadyRecorded: false, weather };
}

export function describeDuplicate(source: RideSource | undefined): string {
  if (source === 'strava') return 'This ride was already counted from Strava, so no extra wear was added.';
  if (source === 'file') return 'This ride was already counted from an uploaded file, so no extra wear was added.';
  if (source === 'manual') return 'A ride logged by hand at the same time already counts it, so no extra wear was added.';
  return 'This ride was already counted, so no extra wear was added.';
}

export function describeWeather(weather: RideWeather): string {
  if (weather.status === 'wet') return 'Wet ride: extra wear applied to the drivetrain, brakes and bearings.';
  if (weather.status === 'dry') return 'Dry ride.';
  return weather.summary ? `Weather unknown (${weather.summary.toLowerCase()}).` : 'Weather unknown.';
}
