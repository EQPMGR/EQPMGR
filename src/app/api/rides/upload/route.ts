// POST /api/rides/upload: count a ride from a .FIT / .GPX / .TCX file on one bike.
//
// The browser gzips the file first (GPX files shrink about 10x), so long rides
// fit under the hosting request limit. The file is read here, on the server:
// the numbers come from the file itself, not from the browser, and Garmin's
// FIT library stays server-side (see src/lib/ride-file.ts).
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/server-auth';
import { parseRideFile, RideFileError } from '@/lib/ride-file';
import { recordRideAndApplyWear, rideTerrain, rideIsEbike, describeWeather, describeDuplicate } from '@/lib/rides';

export const runtime = 'nodejs';

/** What the browser may send (compressed, or raw if the browser can't compress). */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
/** Unpacked file size; stops a tiny "zip bomb" from filling memory. */
const MAX_FILE_BYTES = 60 * 1024 * 1024;
/** File rides per rider per 24 h (enough to catch up on a season in a sitting). */
const DAILY_FILE_RIDES = 100;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const uid = auth.user.uid;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The upload didn\'t arrive in one piece. Try again.');
  }

  const equipmentId = String(form.get('equipmentId') ?? '');
  const terrain = String(form.get('terrain') ?? 'auto');
  const conditions = String(form.get('conditions') ?? 'auto');
  const encoding = String(form.get('encoding') ?? 'none');
  const fileName = String(form.get('fileName') ?? '').slice(0, 200);
  const file = form.get('file');
  if (!equipmentId || !(file instanceof Blob)) return fail('Pick a bike and a ride file.');
  if (!['auto', 'road', 'offroad'].includes(terrain) || !['auto', 'wet', 'dry'].includes(conditions)) {
    return fail('Unknown terrain or conditions.');
  }
  if (file.size > MAX_UPLOAD_BYTES) return fail('That file is too big to upload (over 4.5 MB even after compressing).');

  let bytes: Uint8Array;
  try {
    const raw = Buffer.from(await file.arrayBuffer());
    bytes = encoding === 'gzip' ? gunzipSync(raw, { maxOutputLength: MAX_FILE_BYTES }) : raw;
  } catch {
    return fail('That file couldn\'t be unpacked. Try again, or try another browser.');
  }

  try {
    const supabase = getSupabaseClient();

    const { data: bike, error: bikeError } = await supabase
      .from('equipment')
      .select('id, type')
      .eq('id', equipmentId)
      .eq('user_id', uid)
      .maybeSingle();
    if (bikeError) throw bikeError;
    if (!bike) return fail('Bike not found.', 404);

    // Daily limit; if it can't be checked, refuse (fail closed).
    const { count, error: countError } = await supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('source', 'file')
      .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString());
    if (countError || count == null) return fail('Uploads are paused for a moment. Try again shortly.', 503);
    if (count >= DAILY_FILE_RIDES) {
      return fail(`You've uploaded ${DAILY_FILE_RIDES} rides in the last 24 hours. Try the rest tomorrow.`, 429);
    }

    let parsed;
    try {
      parsed = parseRideFile(bytes);
    } catch (error) {
      if (error instanceof RideFileError) return fail(error.message);
      console.error('[rides/upload] parse', error);
      return fail('That file couldn\'t be read. Is it a .FIT, .GPX or .TCX ride file?');
    }

    const startMs = parsed.startedAt.getTime();
    if (startMs > Date.now() + 5 * 60_000 || startMs < Date.UTC(2000, 0, 1)) {
      return fail('The ride\'s date in this file doesn\'t look right.');
    }
    if (!(parsed.distanceKm > 0.05)) return fail('This file has no distance in it (an indoor ride without a speed sensor?).');
    if (parsed.distanceKm > 1000 || parsed.movingHours > 48) return fail('This ride is longer than 1,000 km or 48 hours, which we can\'t count.');

    const hash = createHash('sha256').update(bytes).digest('hex');
    const name = (parsed.name || fileName.replace(/\.(fit|gpx|tcx)(\.gz)?$/i, '') || 'Uploaded ride').slice(0, 120);
    // Rounded start point: enough for the weather lookup, no exact home address.
    const round = (v: number | null) => (v == null ? null : Math.round(v * 1000) / 1000);

    const recorded = await recordRideAndApplyWear(supabase, {
      userId: uid,
      equipmentId: bike.id,
      source: 'file',
      externalId: `${uid}:${hash}`,
      name,
      startedAt: parsed.startedAt,
      distanceKm: parsed.distanceKm,
      movingHours: parsed.movingHours,
      elevationGainM: parsed.elevationGainM,
      sportType: parsed.sportType,
      terrain: terrain === 'auto' ? rideTerrain(parsed.sportType, bike.type) : (terrain as 'road' | 'offroad'),
      isEbike: rideIsEbike(parsed.sportType, bike.type),
      lat: round(parsed.lat),
      lng: round(parsed.lng),
      weatherOverride: conditions === 'auto' ? null : (conditions as 'wet' | 'dry'),
    });

    const ride = {
      name,
      startedAt: parsed.startedAt.toISOString(),
      distanceKm: Math.round(parsed.distanceKm * 10) / 10,
      movingMinutes: Math.round(parsed.movingHours * 60),
      elevationGainM: parsed.elevationGainM == null ? null : Math.round(parsed.elevationGainM),
    };

    if (recorded.alreadyRecorded) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: recorded.duplicateOf ? describeDuplicate(recorded.duplicateOf) : 'This file was already uploaded.',
        ride,
      });
    }
    return NextResponse.json({
      success: true,
      duplicate: false,
      message: `${ride.distanceKm} km counted. ${describeWeather(recorded.weather)}`,
      weather: describeWeather(recorded.weather),
      ride,
    });
  } catch (error) {
    console.error('[rides/upload]', error);
    return fail('Something went wrong saving this ride. Try again.', 500);
  }
}
