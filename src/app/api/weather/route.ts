
import { type NextRequest, NextResponse } from 'next/server';

// This route fetches weather data from the Open-Meteo API.
// It's a server-side route to avoid exposing the API endpoint to the client
// and to handle potential future API key management.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m`;
    
    const response = await fetch(weatherApiUrl, {
      next: { revalidate: 300 } // Revalidate every 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API failed with status: ${response.status}`);
    }

    const data = await response.json();

    // Create a concise weather description string
    const { temperature_2m, wind_speed_10m } = data.current;
    const weatherDescription = getWeatherDescriptionFromCode(data.current.weather_code);
    const conditions = `${weatherDescription}, ${temperature_2m}°${data.current_units.temperature_2m}, ${wind_speed_10m} ${data.current_units.wind_speed_10m} wind`;
    
    return NextResponse.json({ conditions });

  } catch (error: any) {
    console.error("Weather fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch weather data." }, { status: 500 });
  }
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
