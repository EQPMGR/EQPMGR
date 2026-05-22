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

function jsonError(body: Record<string, any>, status: number) {
  const init: any = { headers: { 'Content-Type': 'application/json' } };
  init.status = status;
  return new NextResponse(JSON.stringify(body), init);
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return jsonError({ error: 'Server misconfigured: service role key missing' }, 500);
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) return jsonError({ error: 'Missing Authorization header' }, 401);

    // Verify token to obtain user id using Supabase Admin client (avoids HTTP layer token mismatches)
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('/api/provision auth.getUser failed', userError);
      return jsonError({ error: 'Invalid user token', detail: userError?.message || 'Token verification failed' }, 401);
    }

    const uid = userData.user.id;
    if (!uid) return jsonError({ error: 'Unable to verify user id' }, 401);

    // Prefer calling a SECURITY DEFINER RPC to avoid table-level permission issues.
    // Ensure you've run the SQL to create `admin_upsert_app_user(p_auth_user_id uuid, p_email text, p_display_name text)`.
    try {
      const user = userData.user;
      const userEmail = user.email ?? null;
      const userDisplayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? userEmail;

      const emailVerified = !!user.email_confirmed_at;
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('admin_upsert_app_user', {
        p_auth_user_id: uid,
        p_email: userEmail,
        p_display_name: userDisplayName,
        p_email_verified: emailVerified,
      });

      if (rpcErr) {
        console.warn('/api/provision rpc failed, falling back to direct upsert', rpcErr);
        const { data: upsertData, error: upsertErr } = await supabaseAdmin
          .from('app_users')
          .upsert(
            {
              id: uid,
              email: userEmail,
              display_name: userDisplayName,
              email_verified: !!user.email_confirmed_at,
            },
            { onConflict: 'id' }
          );

        if (upsertErr) {
          console.error('/api/provision direct upsert failed', upsertErr);
          return jsonError({ error: 'Direct upsert failed', detail: upsertErr }, 500);
        }

        return NextResponse.json({ success: true, row: upsertData });
      }

      return NextResponse.json({ success: true, row: rpcData });
    } catch (e: any) {
      console.error('/api/provision rpc exception', e);
      return jsonError({ error: 'RPC exception', detail: e?.message || String(e) }, 500);
    }
  } catch (err: any) {
    console.error('/api/provision error', err);
    return jsonError({ error: 'Server error', detail: err?.message || String(err) }, 500);
  }
}
