import { NextResponse, type NextRequest } from 'next/server';

async function tryProvider(url: string, parser: (body: any) => { province: string | null; country?: string | null; warning?: string | null } ) {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 * 12 } });
    if (!response.ok) {
      console.warn('IP provider returned non-OK', url, response.status);
      return null;
    }
    const body = await response.json();
    return parser(body);
  } catch (error) {
    console.warn('IP provider fetch failed', url, error);
    return null;
  }
}

export async function GET(_request: NextRequest) {
  const providers = [
    async () => tryProvider('https://ip-api.com/json?fields=status,message,country,regionName', (body) => {
      if (body.status !== 'success') return { province: null, warning: body.message || 'ip-api failure' };
      return { province: body.regionName || null, country: body.country || null };
    }),
    async () => tryProvider('https://ipwho.is/', (body) => {
      if (body.success === false) return { province: null, warning: body.message || 'ipwho.is failure' };
      return { province: body.region || null, country: body.country || null };
    }),
    async () => tryProvider('https://geolocation-db.com/json/', (body) => {
      if (!body) return { province: null, warning: 'geolocation-db no response' };
      return { province: body.state || null, country: body.country_name || null };
    }),
  ];

  let lastWarning: string | null = null;

  for (const provider of providers) {
    const result = await provider();
    if (result) {
      if (result.province) {
        return NextResponse.json({ province: result.province, country: result.country || null, warning: null });
      }
      lastWarning = result.warning || lastWarning;
    }
  }

  // As a final fallback, still succeed but mark unknown.
  return NextResponse.json({ province: null, country: null, warning: lastWarning || 'All IP location providers failed.' });
}

