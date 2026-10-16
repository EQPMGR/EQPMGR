'use strict';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-auth';
import { generateMaintenanceSchedule } from '@/lib/maintenance-schedule';
import { GenerateMaintenanceScheduleInputSchema } from '@/lib/ai-types';

export async function POST(req: Request) {
  try {
    const authResult = await requireUser(req);
    if (!authResult.ok) return authResult.response;

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
