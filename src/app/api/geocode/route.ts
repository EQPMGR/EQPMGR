
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    // Using Nominatim's public API for reverse geocoding.
    // Be mindful of their usage policy (max 1 request/sec).
    const geocodeApiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    
    const response = await fetch(geocodeApiUrl, {
      headers: {
        'User-Agent': 'EQPMGR/1.0 (Contact: admin@eqpmgr.com)', // Required by Nominatim policy
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 * 24 } // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error(`Geocoding API failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }
    
    // The state/province is typically in the 'state' field of the address object.
    const province = data.address?.state;

    return NextResponse.json({ province });

  } catch (error: any) {
    console.error("Geocoding fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch geocoding data." }, { status: 500 });
  }
}
