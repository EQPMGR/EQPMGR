import { NextResponse } from 'next/server';

/**
 * Serverless provisioning endpoint
 * - Verifies the caller's JWT by calling Supabase `/auth/v1/user` with the forwarded Authorization header
 * - If valid, uses the SERVICE_ROLE_KEY to upsert an `app_users` row with `auth_user_id` equal to the verified user id
 *
 * Usage (client):
 *  fetch('/api/provision', { method: 'POST', headers: { Authorization: `Bearer ${user.access_token}` } })
 *
 * Notes:
 *  - Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in server environment (Vercel/Netlify env)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  // fail fast at import time in dev so deploys warn
  console.warn('Missing SUPABASE env vars for /api/provision. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    // 1) verify the user's JWT by calling Supabase auth endpoint
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        apikey: SERVICE_ROLE_KEY, // service key to avoid rate limits
      },
    });

    if (!userResp.ok) {
      const body = await userResp.text();
      return NextResponse.json({ error: 'Invalid user token', detail: body }, { status: 401 });
    }

    const user = await userResp.json();
    if (!user || !user.id) return NextResponse.json({ error: 'Unable to verify user' }, { status: 401 });

    // 2) upsert into app_users using the service role (server-side)
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/app_users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([{ auth_user_id: user.id, email: user.email, display_name: user.user_metadata?.full_name || user.email }]),
    });

    if (!upsertResp.ok) {
      const body = await upsertResp.text();
      return NextResponse.json({ error: 'Failed to upsert user', detail: body }, { status: 500 });
    }

    const result = await upsertResp.json();
    return NextResponse.json({ success: true, row: result }, { status: 200 });
  } catch (err: any) {
    console.error('/api/provision error', err);
    return NextResponse.json({ error: 'Server error', detail: err?.message || String(err) }, { status: 500 });
  }
}
