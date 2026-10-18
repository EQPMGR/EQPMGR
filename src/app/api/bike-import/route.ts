import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/server-auth';
import { isAllowedAdminEmail } from '@/lib/admin-access';
import { extractBikeSpecs, slotSystem, SPEC_MODEL } from '@/lib/spec-extract';
import { matchCatalogParts } from '@/lib/catalog-match';

// POST /api/bike-import: pasted spec-page text -> structured build for the
// Add Bike Model form, with catalog matches and an "already in catalog" check.
// Body: { text, brand?, model?, year? }

const DAILY_LIMIT = 20;
const MAX_CHARS = 60_000;

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { uid, email } = auth.user;

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'Paste the spec page text first.' }, { status: 400 });
  if (text.length > MAX_CHARS) return NextResponse.json({ error: 'That is a lot of text. Paste just the product page.' }, { status: 400 });

  const supabase = serviceClient();

  if (!isAllowedAdminEmail(email)) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await supabase.from('bike_imports').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json({ error: `You've reached today's limit of ${DAILY_LIMIT} imports. Try again tomorrow.` }, { status: 429 });
    }
  }

  const year = Number(body.year);
  const started = Date.now();
  const extraction = await extractBikeSpecs(text, {
    brand: typeof body.brand === 'string' && body.brand.trim() ? body.brand.trim() : undefined,
    model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : undefined,
    modelYear: Number.isInteger(year) && year > 1900 && year < 2100 ? year : undefined,
  });
  const durationMs = Date.now() - started;
  const bike = extraction.bike;

  // Catalog matches for each part, and is this bike already in the catalog?
  const parts = bike.components.map((c) => ({ ...c, name: c.slot === 'Other' ? c.customName || 'Other' : c.slot, system: slotSystem(c.slot) }));
  let matches: Awaited<ReturnType<typeof matchCatalogParts>> = parts.map(() => null);
  try {
    matches = await matchCatalogParts(supabase, parts.map((p) => ({ slot: p.name, brand: p.brand, series: p.series, model: p.model, system: p.system })));
  } catch (error) {
    console.error('[bike-import] catalog matching failed', error);
  }

  let existingBike: { id: string; brand: string; model: string; model_year: number | null } | null = null;
  if (bike.brand && bike.model) {
    let q = supabase.from('bike_models').select('id, brand, model, model_year').ilike('brand', bike.brand).ilike('model', bike.model);
    if (bike.modelYear) q = q.eq('model_year', bike.modelYear);
    const { data } = await q.limit(1).maybeSingle();
    existingBike = data ?? null;
  }

  await supabase.from('bike_imports').insert({
    user_id: uid,
    method: extraction.method,
    model: extraction.method === 'ai' ? SPEC_MODEL : null,
    input_chars: text.length,
    input_tokens: extraction.usage?.inputTokens ?? null,
    output_tokens: extraction.usage?.outputTokens ?? null,
    duration_ms: durationMs,
    parts_found: parts.length,
    parts_matched: matches.filter(Boolean).length,
    fallback_reason: extraction.fallbackReason ?? null,
  });

  // Shape the Add Bike Model form already understands (name/brand/series/model/size/system/chainringN),
  // plus review details it ignores.
  const result = {
    brand: bike.brand ?? undefined,
    model: bike.model ?? undefined,
    modelYear: bike.modelYear ?? undefined,
    type: bike.bikeType ?? undefined,
    isEbike: bike.isEbike,
    wheelSize: bike.wheelSize ?? undefined,
    warnings: bike.warnings,
    components: parts.map((p, i) => ({
      name: p.name,
      system: p.system,
      brand: p.brand ?? undefined,
      series: p.series ?? undefined,
      model: p.model ?? undefined,
      size: [p.spec, p.sizeNotes].filter(Boolean).join('; ') || undefined,
      chainring1: p.chainrings[0] != null ? String(p.chainrings[0]) : undefined,
      chainring2: p.chainrings[1] != null ? String(p.chainrings[1]) : undefined,
      chainring3: p.chainrings[2] != null ? String(p.chainrings[2]) : undefined,
      confidence: p.confidence,
      sourceText: p.sourceText,
      catalogMatch: matches[i] ? { id: matches[i]!.part.id, kind: matches[i]!.kind, label: [matches[i]!.part.brand, matches[i]!.part.series, matches[i]!.part.model].filter(Boolean).join(' ') } : null,
    })),
  };

  return NextResponse.json({ result, method: extraction.method, fallbackReason: extraction.fallbackReason ?? null, existingBike });
}
