import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side provisioning endpoint (server runtime only)
 * - Verifies caller's JWT with Supabase auth
 * - Upserts an `app_users` row using the service-role key via supabase-js (ensures correct privileges)
 *
 * Requires these env vars to be set in your host (Netlify):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env vars for /api/provision. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null;

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured: service role key missing' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    // Verify token to obtain user id
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { Authorization: authHeader, apikey: SERVICE_ROLE_KEY },
    });
    if (!verifyRes.ok) {
      const body = await verifyRes.text();
      return NextResponse.json({ error: 'Invalid user token', detail: body }, { status: 401 });
    }

    const user = await verifyRes.json();
    const uid = user?.id;
    if (!uid) return NextResponse.json({ error: 'Unable to verify user id' }, { status: 401 });

    // Prefer calling a SECURITY DEFINER RPC to avoid table-level permission issues.
    // Ensure you've run the SQL to create `admin_upsert_app_user(p_auth_user_id uuid, p_email text, p_display_name text)`.
    try {
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('admin_upsert_app_user', {
        p_auth_user_id: uid,
        p_email: user.email ?? null,
        p_display_name: user.user_metadata?.full_name ?? user.email ?? null,
      });
      if (rpcErr) {
        console.error('/api/provision rpc error', rpcErr);
        return NextResponse.json({ error: 'RPC upsert failed', detail: rpcErr }, { status: 500 });
      }
      return NextResponse.json({ success: true, row: rpcData }, { status: 200 });
    } catch (e: any) {
      console.error('/api/provision rpc exception', e);
      return NextResponse.json({ error: 'RPC exception', detail: e?.message || String(e) }, { status: 500 });
    }
  } catch (err: any) {
    console.error('/api/provision error', err);
    return NextResponse.json({ error: 'Server error', detail: err?.message || String(err) }, { status: 500 });
  }
}
