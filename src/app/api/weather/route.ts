
import https from 'https';
import { type NextRequest, NextResponse } from 'next/server';

// This route fetches weather data from WeatherAPI.com.
// It is intentionally server-side to keep the API key hidden from the browser.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const query = searchParams.get('q');
  const apiKey = process.env.WEATHERAPI_KEY || process.env.WEATHER_API_KEY || '';

  if ((!lat || !lon) && !query) {
    return NextResponse.json({ error: 'Latitude/longitude or location query is required' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Weather API key is not configured. Set WEATHERAPI_KEY.' }, { status: 500 });
  }

  try {
    const locationQuery = query ? query : `${lat},${lon}`;
    const weatherApiUrl = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(locationQuery)}&aqi=no`;

    const data = await fetchWeatherApiJson(weatherApiUrl);
    const current = data.current;

    if (!current) {
      throw new Error('Weather API did not return current conditions.');
    }

    const weatherDescription = current.condition?.text || 'Unknown conditions';
    const temp = current.temp_c !== undefined ? `${current.temp_c}°C` : 'N/A';
    const wind = current.wind_kph !== undefined ? `${current.wind_kph} km/h wind` : 'N/A';
    const conditions = `${weatherDescription}, ${temp}, ${wind}`;
    
    return NextResponse.json({ conditions });

  } catch (error: any) {
    console.error("Weather fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch weather data." }, { status: 500 });
  }
}

async function fetchWeatherApiJson(url: string) {
  return new Promise<any>((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });

    https.get(url, { agent }, (res) => {
      let body = '';
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Weather API failed with status ${res.statusCode}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper to convert WMO code to a human-readable string
function getWeatherDescriptionFromCode(code: number): string {
    const descriptions: { [key: number]: string } = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
    };
    return descriptions[code] || 'Unknown conditions';
}
