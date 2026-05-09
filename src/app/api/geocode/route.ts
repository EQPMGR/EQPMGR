
import { type NextRequest, NextResponse } from 'next/server';

function isWithinBritishColumbia(lat: number, lon: number): boolean {
  // Approximate bounding box for British Columbia.
  return lat >= 48 && lat <= 60 && lon >= -141 && lon <= -113;
}

async function getIpLocation(): Promise<{ province: string | null; country: string | null; warning?: string }> {
  try {
    const response = await fetch('http://ip-api.com/json?fields=status,message,country,regionName', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('IP geolocation API returned', response.status);
      return { province: null, country: null, warning: 'IP geolocation service unavailable.' };
    }

    const data = await response.json();
    if (data.status !== 'success') {
      console.warn('IP geolocation API returned error', data.message);
      return { province: null, country: null, warning: data.message || 'IP geolocation failed.' };
    }

    return { province: data.regionName || null, country: data.country || null };
  } catch (err: any) {
    console.error('IP geolocation fetch error:', err);
    return { province: null, country: null, warning: err.message || 'Failed to reach IP geolocation service.' };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (lat && lon) {
    const latitudeNum = Number(lat);
    const longitudeNum = Number(lon);

    try {
      const geocodeApiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const response = await fetch(geocodeApiUrl, {
        headers: {
          'User-Agent': 'EQPMGR/1.0 (Contact: admin@eqpmgr.com)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 3600 * 24 },
      });

      if (!response.ok) {
        console.warn(`Geocoding API returned status ${response.status}`);
        if (!Number.isNaN(latitudeNum) && isWithinBritishColumbia(latitudeNum, longitudeNum)) {
          return NextResponse.json({ province: 'British Columbia', source: 'fallback:bbox', message: 'Nominatim unavailable; BC bounding box fallback.' });
        }

        const ipResult = await getIpLocation();
        return NextResponse.json({ province: ipResult.province, country: ipResult.country, source: 'fallback:ip', warning: ipResult.warning });
      }

      const data = await response.json();
      const province = data?.address?.state ?? data?.address?.province ?? null;

      if (province) {
        return NextResponse.json({ province, country: data?.address?.country || null, source: 'nominatim' });
      }

      if (!Number.isNaN(latitudeNum) && isWithinBritishColumbia(latitudeNum, longitudeNum)) {
        return NextResponse.json({ province: 'British Columbia', source: 'fallback:bbox', warning: 'Nominatim did not provide province; BC bounding box fallback.' });
      }

      const ipResult = await getIpLocation();
      return NextResponse.json({ province: ipResult.province, country: ipResult.country, source: 'fallback:ip', warning: ipResult.warning });

    } catch (error: any) {
      console.error('Geocoding fetch error:', error);
      const latitudeNum = Number(lat);
      const longitudeNum = Number(lon);
      if (!Number.isNaN(latitudeNum) && isWithinBritishColumbia(latitudeNum, longitudeNum)) {
        return NextResponse.json({ province: 'British Columbia', source: 'fallback:bbox', warning: `${error.message || 'Nominatim fetch error'} (BC fallback)` });
      }

      const ipResult = await getIpLocation();
      return NextResponse.json({ province: ipResult.province, country: ipResult.country, source: 'fallback:ip', warning: ipResult.warning });
    }
  }

  // No lat/lon: use IP-based geolocation as best effort.
  const ipResult = await getIpLocation();
  return NextResponse.json({ province: ipResult.province, country: ipResult.country, source: 'fallback:ip', warning: ipResult.warning });
}

