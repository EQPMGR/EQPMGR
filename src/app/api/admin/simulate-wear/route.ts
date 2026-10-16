'use strict';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-auth';
import { simulateWear } from '@/lib/wear-simulation';
import { SimulateWearInputSchema } from '@/lib/ai-types';

export async function POST(req: Request) {
  try {
    const authResult = await requireUser(req);
    if (!authResult.ok) return authResult.response;

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
