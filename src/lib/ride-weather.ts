// Server-only: looks up the weather for a ride's time and place (WeatherAPI.com
// history) and decides whether it was a wet ride for wear purposes.
//
// Wet = at least WET_DURING_MM of rain/snow during the ride, or at least
// WET_BEFORE_MM in the WET_BEFORE_HOURS before it started (wet, gritty ground).
// The free WeatherAPI plan only has about 7 days of history; older rides come
// back 'unknown' and get no wet multiplier.

const WET_DURING_MM = 0.3;
const WET_BEFORE_MM = 1.0;
const WET_BEFORE_HOURS = 12;
const HISTORY_DAYS = 7;

export type RideWeather = {
  status: 'wet' | 'dry' | 'unknown';
  summary: string | null;
  precipDuringMm: number | null;
  precipBeforeMm: number | null;
};

type Hour = { time_epoch: number; precip_mm: number; condition?: { text?: string }; temp_c?: number };

const UNKNOWN = (summary: string | null): RideWeather => ({ status: 'unknown', summary, precipDuringMm: null, precipBeforeMm: null });

function isoDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function getRideWeather({
  lat,
  lng,
  startedAt,
  movingHours,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  startedAt: Date;
  movingHours: number;
}): Promise<RideWeather> {
  const apiKey = process.env.WEATHERAPI_KEY || process.env.WEATHER_API_KEY;
  if (!apiKey) return UNKNOWN('Weather lookup is not configured.');
  if (lat == null || lng == null) return UNKNOWN('No location for this ride.');

  const start = startedAt.getTime();
  const end = start + Math.max(movingHours, 0) * 3600_000;
  if (Date.now() - start > HISTORY_DAYS * 24 * 3600_000) {
    return UNKNOWN('Ride is older than the weather history we can look up.');
  }

  // WeatherAPI's `dt` is the local date at the location; fetch every UTC date
  // that could be involved (+/- 14h covers any time zone) and filter by epoch.
  const windowStart = start - WET_BEFORE_HOURS * 3600_000;
  const dates = new Set<string>();
  for (let t = windowStart - 14 * 3600_000; t <= end + 14 * 3600_000; t += 12 * 3600_000) dates.add(isoDate(t));
  dates.add(isoDate(end + 14 * 3600_000));

  const hours = new Map<number, Hour>();
  try {
    await Promise.all([...dates].map(async (dt) => {
      const url = `https://api.weatherapi.com/v1/history.json?key=${encodeURIComponent(apiKey)}&q=${lat},${lng}&dt=${dt}`;
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!res.ok) return; // e.g. date outside the plan's history window
      const data = await res.json();
      for (const day of data?.forecast?.forecastday ?? []) {
        for (const h of day.hour ?? []) hours.set(h.time_epoch, h);
      }
    }));
  } catch (error) {
    console.error('[ride-weather] lookup failed', error);
    return UNKNOWN('Weather lookup failed.');
  }
  if (hours.size === 0) return UNKNOWN('No weather history for this ride.');

  // An hourly record at time_epoch covers [epoch, epoch + 1h).
  const overlaps = (from: number, to: number) =>
    [...hours.values()].filter((h) => h.time_epoch * 1000 < to && h.time_epoch * 1000 + 3600_000 > from);

  const during = overlaps(start, Math.max(end, start + 1));
  const before = overlaps(windowStart, start);
  const sum = (hs: Hour[]) => Math.round(hs.reduce((s, h) => s + (h.precip_mm || 0), 0) * 10) / 10;
  const precipDuringMm = sum(during);
  const precipBeforeMm = sum(before);

  const wet = precipDuringMm >= WET_DURING_MM || precipBeforeMm >= WET_BEFORE_MM;
  const first = during[0];
  const conditions = first?.condition?.text ? `${first.condition.text}${first.temp_c != null ? `, ${Math.round(first.temp_c)}°C` : ''}` : null;
  const summary = [
    conditions,
    `${precipDuringMm} mm rain during the ride`,
    `${precipBeforeMm} mm in the ${WET_BEFORE_HOURS} h before`,
  ].filter(Boolean).join('; ');

  return { status: wet ? 'wet' : 'dry', summary, precipDuringMm, precipBeforeMm };
}
