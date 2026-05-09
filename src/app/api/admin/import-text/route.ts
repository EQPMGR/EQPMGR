'use strict';

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';
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
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(token, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });

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
