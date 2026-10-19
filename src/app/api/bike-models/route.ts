import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-auth';
import { saveBikeModelAction } from '@/app/(app)/add-bike-model/actions';
import type { AddBikeModelFormValues } from '@/app/(app)/add-bike-model/page';

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (!authResult.ok) return authResult.response;
  const { idToken } = authResult.user;

  let values: AddBikeModelFormValues;
  let catalogOnly = false;
  try {
    const { catalogOnly: catalogOnlyFlag, ...rest } = await request.json();
    values = rest;
    catalogOnly = catalogOnlyFlag === true;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Invalid request payload.' },
      { status: 400 }
    );
  }

  try {
    const result = await saveBikeModelAction({ idToken, values, catalogOnly });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to save bike model.' },
      { status: 500 }
    );
  }
}
