// Server-only: read a ride from a .FIT, .GPX or .TCX file exported from a bike
// computer, watch or phone app (Garmin, Wahoo, Hammerhead, Coros, ...).
//
// Garmin's FIT SDK is licensed for our own use, not for handing out, so FIT
// files are always read here on the server, never in the browser.
import { Decoder, Stream } from '@garmin/fitsdk';

export type RideFileFormat = 'fit' | 'gpx' | 'tcx';

export type ParsedRide = {
  format: RideFileFormat;
  name: string | null;
  startedAt: Date;
  distanceKm: number;
  movingHours: number;
  elevationGainM: number | null;
  /** Strava-style ride type (MountainBikeRide, GravelRide, EBikeRide...), or null if the file doesn't say. */
  sportType: string | null;
  lat: number | null;
  lng: number | null;
};

/** A problem with the file itself; the message is shown to the rider. */
export class RideFileError extends Error {}

type Point = { time: Date | null; lat: number | null; lng: number | null; ele: number | null; distM: number | null };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function parseRideFile(bytes: Uint8Array): ParsedRide {
  if (bytes.length >= 12 && String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === '.FIT') {
    return parseFit(bytes);
  }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  if (/<gpx[\s>]/i.test(text)) return parseGpx(new TextDecoder().decode(bytes));
  if (/<TrainingCenterDatabase[\s>]/i.test(text)) return parseTcx(new TextDecoder().decode(bytes));
  throw new RideFileError('That doesn\'t look like a .FIT, .GPX or .TCX ride file.');
}

// ---------------------------------------------------------------------------
// FIT
// ---------------------------------------------------------------------------

const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;

function fitSportType(sport: unknown, subSport: unknown): string | null {
  const s = String(sport ?? '');
  const sub = String(subSport ?? '');
  if (s === 'eBiking' || /^eBike/.test(sub)) {
    return /mountain|enduro/i.test(sub) ? 'EMountainBikeRide' : 'EBikeRide';
  }
  if (s !== 'cycling') return null;
  if (sub === 'mountain' || sub === 'downhill' || sub === 'bmx') return 'MountainBikeRide';
  if (sub === 'gravelCycling' || sub === 'cyclocross') return 'GravelRide';
  if (sub === 'indoorCycling' || sub === 'virtualActivity' || sub === 'spin') return 'VirtualRide';
  if (sub === 'handCycling') return 'Handcycle';
  return 'Ride';
}

function isFitRide(sport: unknown) {
  return sport === 'cycling' || sport === 'eBiking';
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function parseFit(bytes: Uint8Array): ParsedRide {
  const stream = Stream.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  if (!Decoder.isFIT(stream)) throw new RideFileError('This .FIT file couldn\'t be read.');
  const decoder = new Decoder(stream);
  if (!decoder.checkIntegrity()) {
    throw new RideFileError('This .FIT file is damaged or incomplete. Try exporting it again.');
  }
  const { messages } = decoder.read();

  const sessions = messages.sessionMesgs ?? [];
  const rideSessions = sessions.filter((s) => isFitRide(s.sport));
  if (sessions.length > 0 && rideSessions.length === 0) {
    const sport = String(sessions[0].sport ?? 'activity');
    throw new RideFileError(`This file is a ${sport.replace(/([A-Z])/g, ' $1').toLowerCase()} activity, not a bike ride.`);
  }

  // FIT files don't carry the ride's title; the upload uses the file name.
  const name = null;

  // Normal case: the device wrote ride totals in session messages.
  const totalM = rideSessions.reduce((sum, s) => sum + (num(s.totalDistance) ?? 0), 0);
  if (rideSessions.length > 0 && totalM > 0) {
    const first = rideSessions[0];
    const startedAt = first.startTime instanceof Date ? first.startTime : null;
    if (!startedAt) throw new RideFileError('This file has no start time.');
    const seconds = rideSessions.reduce(
      (sum, s) => sum + (num(s.totalMovingTime) ?? num(s.totalTimerTime) ?? num(s.totalElapsedTime) ?? 0),
      0
    );
    const ascents = rideSessions.map((s) => num(s.totalAscent));
    const lat = num(first.startPositionLat);
    const lng = num(first.startPositionLong);
    return {
      format: 'fit',
      name,
      startedAt,
      distanceKm: totalM / 1000,
      movingHours: seconds / 3600,
      elevationGainM: ascents.every((a) => a == null) ? null : ascents.reduce<number>((sum, a) => sum + (a ?? 0), 0),
      sportType: fitSportType(first.sport, first.subSport),
      lat: lat != null ? lat * SEMICIRCLE_TO_DEG : null,
      lng: lng != null ? lng * SEMICIRCLE_TO_DEG : null,
    };
  }

  // No usable totals (some apps skip them): work it out from the GPS points.
  const points: Point[] = (messages.recordMesgs ?? []).map((r) => ({
    time: r.timestamp instanceof Date ? r.timestamp : null,
    lat: num(r.positionLat) != null ? num(r.positionLat)! * SEMICIRCLE_TO_DEG : null,
    lng: num(r.positionLong) != null ? num(r.positionLong)! * SEMICIRCLE_TO_DEG : null,
    ele: num(r.enhancedAltitude) ?? num(r.altitude),
    distM: num(r.distance),
  }));
  const fileSport = messages.sportMesgs?.[0];
  return {
    format: 'fit',
    name,
    ...summarizePoints(points),
    sportType: fileSport ? fitSportType(fileSport.sport, fileSport.subSport) : null,
  };
}

// ---------------------------------------------------------------------------
// GPX and TCX (plain XML; read with simple patterns, no XML parser needed)
// ---------------------------------------------------------------------------

function decodeXmlText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i'));
  return m ? decodeXmlText(m[1]) : null;
}

function attr(openTag: string, name: string): number | null {
  const m = openTag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) ? v : null;
}

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNum(s: string | null): number | null {
  if (s == null || s === '') return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** GPX/TCX activity type words -> Strava-style type. Unknown words -> null (go by the bike). */
function textSportType(type: string | null): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (/e-?mountain|e-?mtb/.test(t)) return 'EMountainBikeRide';
  if (/e-?bik/.test(t)) return 'EBikeRide';
  if (/mountain|mtb/.test(t)) return 'MountainBikeRide';
  if (/gravel|cyclocross/.test(t)) return 'GravelRide';
  if (/virtual|indoor/.test(t)) return 'VirtualRide';
  if (/run|walk|hik|swim|row|ski/.test(t)) throw new RideFileError(`This file is a ${type} activity, not a bike ride.`);
  return null;
}

function parseGpx(xml: string): ParsedRide {
  const trk = xml.match(/<(?:\w+:)?trk\b[\s\S]*?<\/(?:\w+:)?trk>/i)?.[0] ?? xml;
  const beforePoints = trk.split(/<(?:\w+:)?trkseg\b/i)[0];
  const name = tag(beforePoints, 'name');
  const type = tag(beforePoints, 'type');

  const points: Point[] = [];
  const re = /<(?:\w+:)?trkpt\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?trkpt>|<(?:\w+:)?trkpt\b([^>]*)\/>/gi;
  for (let m: RegExpExecArray | null; (m = re.exec(xml)); ) {
    const open = m[1] ?? m[3] ?? '';
    const body = m[2] ?? '';
    points.push({
      time: toDate(tag(body, 'time')),
      lat: attr(open, 'lat'),
      lng: attr(open, 'lon'),
      ele: toNum(tag(body, 'ele')),
      distM: null,
    });
  }
  return { format: 'gpx', name, ...summarizePoints(points), sportType: textSportType(type) };
}

function parseTcx(xml: string): ParsedRide {
  const activity = xml.match(/<(?:\w+:)?Activity\b([^>]*)>/i);
  const sport = activity ? (activity[1].match(/Sport\s*=\s*["']([^"']+)["']/i)?.[1] ?? null) : null;
  if (sport && !/^(biking|other)$/i.test(sport)) {
    throw new RideFileError(`This file is a ${sport.toLowerCase()} activity, not a bike ride.`);
  }

  const points: Point[] = [];
  const re = /<(?:\w+:)?Trackpoint\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Trackpoint>/gi;
  for (let m: RegExpExecArray | null; (m = re.exec(xml)); ) {
    const body = m[1];
    const pos = tag(body, 'Position');
    points.push({
      time: toDate(tag(body, 'Time')),
      lat: pos ? toNum(tag(pos, 'LatitudeDegrees')) : null,
      lng: pos ? toNum(tag(pos, 'LongitudeDegrees')) : null,
      ele: toNum(tag(body, 'AltitudeMeters')),
      distM: toNum(tag(body, 'DistanceMeters')),
    });
  }

  // Lap totals are what the device itself measured; prefer them when present.
  const laps = [...xml.matchAll(/<(?:\w+:)?Lap\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Lap>/gi)].map((m) => {
    const head = m[1].split(/<(?:\w+:)?Track\b/i)[0];
    return { seconds: toNum(tag(head, 'TotalTimeSeconds')), meters: toNum(tag(head, 'DistanceMeters')) };
  });
  const summary = summarizePoints(points);
  const lapMeters = laps.reduce((s, l) => s + (l.meters ?? 0), 0);
  const lapSeconds = laps.reduce((s, l) => s + (l.seconds ?? 0), 0);
  if (lapMeters > 0) summary.distanceKm = lapMeters / 1000;
  if (lapSeconds > 0 && summary.movingHours === 0) summary.movingHours = lapSeconds / 3600;

  const name = tag(xml.match(/<(?:\w+:)?Activity\b[\s\S]*?<(?:\w+:)?Lap\b/i)?.[0] ?? '', 'Notes');
  return { format: 'tcx', name: name ? name.slice(0, 120) : null, ...summary, sportType: null };
}

// ---------------------------------------------------------------------------
// Totals from track points
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6371008.8;

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Slower than this (m/s) counts as stopped. 1.8 km/h. */
const MOVING_MIN_SPEED = 0.5;
/** Faster than this (m/s) is a GPS glitch, not riding. 108 km/h. */
const GLITCH_SPEED = 30;
/** Climbs smaller than this (m) are treated as GPS/barometer noise. */
const CLIMB_NOISE_M = 3;

function summarizePoints(points: Point[]) {
  const timed = points.filter((p) => p.time);
  if (timed.length < 2) throw new RideFileError('This file has no timed track points, so the ride can\'t be measured.');

  // Prefer the device's own odometer (TCX, FIT records); else measure between GPS fixes.
  const useDeviceDistance = timed.filter((p) => p.distM != null).length >= timed.length * 0.8;
  const usable = useDeviceDistance
    ? timed.filter((p) => p.distM != null)
    : timed.filter((p) => p.lat != null && p.lng != null);
  if (usable.length < 2) throw new RideFileError('This file has no GPS track or distance, so the ride can\'t be measured.');

  let distM = 0;
  let movingS = 0;
  for (let i = 1; i < usable.length; i++) {
    const a = usable[i - 1];
    const b = usable[i];
    const dt = (b.time!.getTime() - a.time!.getTime()) / 1000;
    if (!(dt > 0)) continue;
    const d = useDeviceDistance ? Math.max(0, b.distM! - a.distM!) : haversineM(a.lat!, a.lng!, b.lat!, b.lng!);
    const speed = d / dt;
    if (speed > GLITCH_SPEED) continue;
    distM += d;
    if (speed >= MOVING_MIN_SPEED) movingS += dt;
  }

  // Elevation gain with a small dead band so sensor noise doesn't add up.
  let gain = 0;
  let ref: number | null = null;
  let hasEle = false;
  for (const p of points) {
    if (p.ele == null) continue;
    hasEle = true;
    // The reference only moves once height changes by more than the noise band.
    if (ref == null || p.ele < ref - CLIMB_NOISE_M) ref = p.ele;
    else if (p.ele > ref + CLIMB_NOISE_M) {
      gain += p.ele - ref;
      ref = p.ele;
    }
  }

  const firstFix = points.find((p) => p.lat != null && p.lng != null);
  return {
    startedAt: timed[0].time!,
    distanceKm: distM / 1000,
    movingHours: movingS / 3600,
    elevationGainM: hasEle ? gain : null,
    lat: firstFix?.lat ?? null,
    lng: firstFix?.lng ?? null,
  };
}
