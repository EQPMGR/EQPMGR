import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { saveBikeModelAction } from '@/app/(app)/admin/add-bike-model/actions';
import type { AddBikeModelFormValues } from '@/app/(app)/admin/add-bike-model/page';

export async function POST(request: Request) {
  const authResult = await requireAdmin(request);
  if (!authResult.ok) return authResult.response;
  const { idToken } = authResult.user;

  let values: AddBikeModelFormValues;
  try {
    values = await request.json();
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Invalid request payload.' },
      { status: 400 }
    );
  }

  try {
    const result = await saveBikeModelAction({ idToken, values });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to save bike model.' },
      { status: 500 }
    );
  }
}
