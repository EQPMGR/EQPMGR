import { NextResponse } from 'next/server';
import { getServerDb } from '@/backend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const value = body.value ?? 'FUCK';

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = await getServerDb();
    await db.updateDoc('app_users', userId, { strava: value });

    return NextResponse.json({ success: true, userId, value });
  } catch (error: any) {
    console.error('Debug service-role write failed', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
