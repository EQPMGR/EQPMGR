import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/server-auth';

// Admin: shop approvals (migration 021). Riders only see approved shops that
// also have a working card on file.
function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const supabase = serviceClient();
  const [{ data: shops, error }, { data: billing }] = await Promise.all([
    supabase.from('service_providers').select('id, shop_name, city, state, phone, website, created_at').order('created_at', { ascending: false }),
    supabase.from('shop_billing').select('shop_id, status, approved_at, terms_accepted_at'),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byShop = new Map((billing ?? []).map((b) => [b.shop_id, b]));
  return NextResponse.json({
    shops: (shops ?? []).map((s) => {
      const b = byShop.get(s.id);
      return { ...s, billingStatus: b?.status ?? 'setup_needed', approvedAt: b?.approved_at ?? null, termsAcceptedAt: b?.terms_accepted_at ?? null };
    }),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { shopId, approve } = await request.json().catch(() => ({}));
  if (typeof shopId !== 'string' || typeof approve !== 'boolean') {
    return NextResponse.json({ error: 'shopId and approve are required.' }, { status: 400 });
  }
  const supabase = serviceClient();
  const { data: shop } = await supabase.from('service_providers').select('id').eq('id', shopId).maybeSingle();
  if (!shop) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });

  await supabase.from('shop_billing').upsert({ shop_id: shopId }, { onConflict: 'shop_id', ignoreDuplicates: true });
  const { error } = await supabase.from('shop_billing').update({
    approved_at: approve ? new Date().toISOString() : null,
    approved_by: approve ? auth.user.uid : null,
    updated_at: new Date().toISOString(),
  }).eq('shop_id', shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
