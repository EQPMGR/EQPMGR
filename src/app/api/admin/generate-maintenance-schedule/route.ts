'use strict';

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';
import { generateMaintenanceSchedule } from '@/lib/maintenance-schedule';
import { GenerateMaintenanceScheduleInputSchema } from '@/lib/ai-types';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(token, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = GenerateMaintenanceScheduleInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid schedule input.', details: parsed.error.format() }, { status: 400 });
    }

    const result = generateMaintenanceSchedule(parsed.data);
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error('generate-maintenance-schedule route error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
