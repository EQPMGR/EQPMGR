'use strict';

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';
import { getImportFeedbackRecords, analyzeImportFeedback } from '@/lib/import-feedback-analytics';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(token, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });

    const records = await getImportFeedbackRecords(1000);
    const summary = analyzeImportFeedback(records);
    return NextResponse.json({ summary, sampleCount: records.length });
  } catch (error: any) {
    console.error('Import feedback analysis error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
