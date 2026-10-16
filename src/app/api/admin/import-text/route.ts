'use strict';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-auth';
import { parseBikeText } from '@/lib/bike-parser';

type ImportRequest = {
  text?: string;
  brand?: string;
  model?: string;
  year?: string | number;
};

/**
 * POST /api/admin/import-text
 * Body: { text: string }
 * Returns JSON: { result: { brand?, model?, modelYear?, components: [...] } }
 *
 * Behavior:
 * - Uses deterministic text parsing only; no AI or paid API is invoked.
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireUser(req);
    if (!authResult.ok) return authResult.response;

    const body: ImportRequest = await req.json().catch(() => ({} as ImportRequest));
    const text = (body.text || '').trim();
    if (!text) return NextResponse.json({ error: 'Missing text in request body.' }, { status: 400 });

    const yearValue = typeof body.year === 'string' ? Number(body.year) : body.year;
    const result = parseBikeText(text, {
      brand: body.brand?.trim() || undefined,
      model: body.model?.trim() || undefined,
      modelYear: Number.isFinite(yearValue) ? yearValue : undefined,
    });
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Import-text handler error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
