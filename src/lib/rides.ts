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

export type NewRide = {
  userId: string;
  equipmentId: string;
  source: 'strava' | 'manual';
  externalId?: string | null;
  name?: string | null;
  startedAt: Date;
  distanceKm: number;
  movingHours: number;
  sportType?: string | null;
  terrain: 'road' | 'offroad';
  isEbike: boolean;
  lat?: number | null;
  lng?: number | null;
  /** Rider says it was wet/dry; skips the weather lookup's verdict. */
  weatherOverride?: 'wet' | 'dry' | null;
};

export type RecordedRide = { alreadyRecorded: boolean; weather: RideWeather };

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
    // Another request recorded the same Strava ride first.
    if (error.code === '23505') return { alreadyRecorded: true, weather };
    throw error;
  }

  const { error: applyError } = await supabase.rpc('apply_ride_wear', { p_ride_id: inserted.id });
  if (applyError) throw applyError;

  return { alreadyRecorded: false, weather };
}

export function describeWeather(weather: RideWeather): string {
  if (weather.status === 'wet') return 'Wet ride: extra wear applied to the drivetrain, brakes and bearings.';
  if (weather.status === 'dry') return 'Dry ride.';
  return weather.summary ? `Weather unknown (${weather.summary.toLowerCase()}).` : 'Weather unknown.';
}
