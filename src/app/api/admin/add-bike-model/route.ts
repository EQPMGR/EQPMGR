import { NextResponse } from 'next/server';
import { saveBikeModelAction } from '@/app/(app)/admin/add-bike-model/actions';
import type { AddBikeModelFormValues } from '@/app/(app)/admin/add-bike-model/page';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return NextResponse.json(
      { success: false, message: 'Missing authorization token.' },
      { status: 401 }
    );
  }

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
