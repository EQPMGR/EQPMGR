'use server';

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';
import { simulateWear } from '@/ai/flows/simulate-wear';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(token, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const result = await simulateWear(body);
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error('simulate-wear route error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
