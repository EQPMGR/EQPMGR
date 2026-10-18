import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { accessSecret } from '@/lib/secrets';
import { stravaWebhookVerifyToken } from '@/lib/strava-sync';

// Admin: view / create / delete the app's single Strava push subscription.
const API = 'https://www.strava.com/api/v3/push_subscriptions';

async function credentials() {
  const [clientId, clientSecret] = await Promise.all([
    accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID'),
    accessSecret('STRAVA_CLIENT_SECRET'),
  ]);
  return { clientId, clientSecret };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { clientId, clientSecret } = await credentials();
  const res = await fetch(`${API}?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => []);
  return NextResponse.json({ subscriptions: Array.isArray(data) ? data : [], error: res.ok ? null : data?.message });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const origin = new URL(request.url).origin;
  if (!origin.startsWith('https://')) {
    return NextResponse.json({ error: 'Strava can only call a public https address. Do this on the live site.' }, { status: 400 });
  }
  const { clientId, clientSecret } = await credentials();
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: `${origin}/api/strava/webhook`,
      verify_token: await stravaWebhookVerifyToken(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data?.errors?.[0]?.code ? `${data.message}: ${data.errors[0].field} ${data.errors[0].code}` : data?.message || 'Strava refused the subscription.' }, { status: 400 });
  }
  return NextResponse.json({ subscription: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'Missing subscription id' }, { status: 400 });
  const { clientId, clientSecret } = await credentials();
  const res = await fetch(`${API}/${id}?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`, { method: 'DELETE' });
  return NextResponse.json({ deleted: res.ok }, { status: res.ok ? 200 : 400 });
}
