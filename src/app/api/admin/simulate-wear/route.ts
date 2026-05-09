'use strict';

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';
import { simulateWear } from '@/lib/wear-simulation';
import { SimulateWearInputSchema } from '@/lib/ai-types';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(token, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = SimulateWearInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid simulation input.', details: parsed.error.format() }, { status: 400 });
    }

    const result = simulateWear(parsed.data);
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error('simulate-wear route error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
