import { NextResponse } from 'next/server';
import { updateMasterComponentAndSyncUsers } from '@/app/(app)/admin/add-bike-model/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterComponentId, updates } = body;

    if (!masterComponentId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid payload. Provide masterComponentId and updates object.' }, { status: 400 });
    }

    const res = await updateMasterComponentAndSyncUsers({ masterComponentId, updates });
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error('admin master sync failed', error);
    return NextResponse.json({ error: error.message || 'Unknown server error' }, { status: 500 });
  }
}
